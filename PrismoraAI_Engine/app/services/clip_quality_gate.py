# app/services/clip_quality_gate.py
"""
CLIP QUALITY GATE  v5.1  –  PRE-EXTRACTION Groq LLM validation

KEY CHANGE from v5:
  OLD: Validate AFTER extraction + upload  (wasted 10+ min on rejected clips)
  NEW: Validate transcript text BEFORE extraction  (fast, ~0.5s, no waste)

Uses 1–2 Groq API calls per run:
  1. Rate all candidate clip transcripts  (~300 words each)
  2. If budget under-filled after filtering, asks for suggested clip indexes

Free tier: 30 req/min, 14,400 req/day — well within limits.
"""

import json
import time
from typing import List, Dict, Tuple, Optional

from app.core.config import settings

try:
    from groq import Groq as GroqClient
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False
    print("[ClipQualityGate] ⚠️  groq not installed — LLM quality gate disabled")

_TIMEOUT_SECS = 12


class ClipQualityGate:
    """Pre-extraction validation using Groq Llama 3.3 70B."""

    def __init__(self):
        self.client = None
        self._disabled = False

        groq_key = getattr(settings, 'GROQ_API_KEY', None)
        gate_enabled = getattr(settings, 'HIGHLIGHT_LLM_QUALITY_GATE', True)

        if groq_key and GROQ_AVAILABLE and gate_enabled:
            try:
                self.client = GroqClient(api_key=groq_key)
                print("[ClipQualityGate] ✅ Groq connected (Llama 3.3 70B quality gate)")
            except Exception as e:
                print(f"[ClipQualityGate] ⚠️  Groq init failed: {e}")
        else:
            reason = (
                "disabled in config" if not gate_enabled
                else "no GROQ_API_KEY" if not groq_key
                else "groq not installed"
            )
            print(f"[ClipQualityGate] ⚠️  Quality gate OFF ({reason})")

    # ─────────────────────────────────────────────────────────────────────
    #  PRE-EXTRACTION: validate transcript text, not uploaded videos
    # ─────────────────────────────────────────────────────────────────────
    def validate_candidates(
        self,
        candidates: List[Dict],
        budget_seconds: float,
    ) -> List[Dict]:
        """
        Validate candidate clips BEFORE extraction using transcript text.

        Args:
            candidates: list of {
                "candidate_idx":  int,     (0-based index into the candidate pool)
                "transcript":     str,     (full clip transcript text)
                "duration_secs":  float,
                "conv_type":      str,
                "quality_score":  float,
            }
            budget_seconds: total target duration

        Returns:
            Same list of dicts with added fields:
                "llm_completeness": float (0-10)
                "llm_quality":      float (0-10)
                "llm_approved":     bool
            If Groq unavailable, all clips marked approved with score 7.
        """
        if not self.client or self._disabled or not candidates:
            # Fallback: approve all
            for c in candidates:
                c['llm_completeness'] = 7
                c['llm_quality'] = 7
                c['llm_approved'] = True
            return candidates

        # Build prompt with fuller transcripts (up to ~500 words each)
        clips_text = ""
        for ct in candidates:
            words  = ct['transcript'].split()[:500]
            text   = ' '.join(words)
            clips_text += (
                f"\n--- CANDIDATE {ct['candidate_idx']} "
                f"({ct['duration_secs']:.0f}s, type={ct['conv_type']}) ---\n"
                f"{text}\n"
            )

        prompt = f"""You are a podcast highlight quality judge. I have {len(candidates)} candidate clips for a {budget_seconds:.0f}s highlight reel.

Rate each candidate on 2 criteria (0-10 integer scale):

1. **completeness**: Does this clip contain COMPLETE thoughts and exchanges? A clip that starts mid-sentence or ends on an unanswered question scores low. A clip with full Q&A exchanges or complete stories scores high. Be lenient — if the clip conveys a complete idea even if the first/last sentence is slightly cut, give 6+.

2. **quality**: How insightful, entertaining, or valuable is this clip for a viewer? 10 = viral-worthy wisdom/humor/story. 0 = boring filler.

Podcasts naturally have imperfect transcriptions. Don't penalize for minor transcript artifacts.

Candidates:
{clips_text}

Respond ONLY with a JSON array. No explanation, no markdown:
[{{"idx": 0, "completeness": 8, "quality": 7}}, ...]"""

        try:
            t0 = time.time()
            response = self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=600,
                timeout=_TIMEOUT_SECS,
            )
            elapsed = time.time() - t0

            raw = response.choices[0].message.content.strip()
            # Handle markdown code blocks
            if '```' in raw:
                parts = raw.split('```')
                raw = parts[1] if len(parts) > 1 else raw
                if raw.startswith('json'):
                    raw = raw[4:]
            raw = raw.strip()

            results = json.loads(raw)
            print(f"[ClipQualityGate] ✅ Groq pre-validated {len(results)} candidates ({elapsed:.1f}s)")

            # Build lookup
            llm_map = {r.get('idx', r.get('candidate_idx', -1)): r for r in results}

            for c in candidates:
                cidx = c['candidate_idx']
                if cidx in llm_map:
                    llm  = llm_map[cidx]
                    comp = llm.get('completeness', 7)
                    qual = llm.get('quality', 5)
                else:
                    comp, qual = 7, 5

                c['llm_completeness'] = comp
                c['llm_quality']      = qual
                # Approve if completeness >= 5 OR quality >= 7 (great content forgives slight cut)
                c['llm_approved']     = comp >= 5 or qual >= 7

                status = "✅" if c['llm_approved'] else "❌"
                print(
                    f"    Candidate {cidx}: completeness={comp}/10 "
                    f"quality={qual}/10 {status}"
                )

            return candidates

        except Exception as e:
            err_str = str(e)
            print(f"[ClipQualityGate] ⚠️  Groq validation failed: {err_str[:120]}")
            if "rate_limit" in err_str.lower() or "quota" in err_str.lower():
                self._disabled = True
                print("[ClipQualityGate] 🔒 Quota hit — gate disabled for this session")
            # Fallback: approve all
            for c in candidates:
                c['llm_completeness'] = 7
                c['llm_quality'] = 7
                c['llm_approved'] = True
            return candidates

    def select_approved(
        self,
        candidates:     List[Dict],
        budget_seconds: float,
        min_budget_pct: float = 0.75,
    ) -> Tuple[List[Dict], List[Dict]]:
        """
        From validated candidates, pick approved clips that fill the budget.

        Returns:
            (approved_clips, rejected_clips)

        If approved clips fill less than min_budget_pct of the budget,
        we re-admit the best rejected clips (by quality score) to fill it.
        """
        approved = [c for c in candidates if c.get('llm_approved', True)]
        rejected = [c for c in candidates if not c.get('llm_approved', True)]

        # Sort approved: best combined score first
        for c in approved:
            c['_combined'] = (
                0.4 * c.get('llm_quality', 5) / 10.0 +
                0.3 * c.get('llm_completeness', 5) / 10.0 +
                0.3 * min(1.0, c.get('quality_score', 0.3))
            )
        approved.sort(key=lambda x: x['_combined'], reverse=True)

        # Budget-aware selection — use ACTUAL duration (not capped) for accounting
        selected  = []
        used_secs = 0.0
        # Only reject individual clips that are > 80% of budget (extreme outliers)
        max_single = budget_seconds * 0.80

        for c in approved:
            dur = c['duration_secs']
            # Hard cap: single clip shouldn't eat >80% of budget on its own
            if dur > max_single and selected:
                continue
            # Allow up to 25% overshoot on budget to avoid under-filling
            if used_secs + dur > budget_seconds * 1.25:
                continue
            used_secs += dur
            selected.append(c)

        # Check budget fill
        fill_pct = used_secs / budget_seconds if budget_seconds > 0 else 1.0
        if fill_pct < min_budget_pct and rejected:
            print(
                f"[ClipQualityGate] ⚠️  Budget only {fill_pct*100:.0f}% filled — "
                f"re-admitting best rejected clips"
            )
            # Sort rejected by quality score descending
            rejected.sort(
                key=lambda c: (c.get('llm_quality', 0), c.get('llm_completeness', 0)),
                reverse=True,
            )
            readmitted = []
            for c in rejected:
                alloc = min(c['duration_secs'], max_single)
                if used_secs + alloc > budget_seconds * 1.20:
                    continue
                used_secs += alloc
                c['llm_approved'] = True  # re-admit
                c['_readmitted']  = True
                selected.append(c)
                readmitted.append(c)
                print(
                    f"    ♻️  Re-admitted candidate {c['candidate_idx']} "
                    f"(quality={c.get('llm_quality', '?')}/10, "
                    f"{c['duration_secs']:.0f}s)"
                )
                fill_pct = used_secs / budget_seconds
                if fill_pct >= min_budget_pct:
                    break

            # Remove readmitted from rejected
            readmitted_ids = {c['candidate_idx'] for c in readmitted}
            rejected = [c for c in rejected if c['candidate_idx'] not in readmitted_ids]

        fill_pct = used_secs / budget_seconds if budget_seconds > 0 else 1.0
        print(
            f"[ClipQualityGate] 📊 Final selection: {len(selected)} clips, "
            f"{used_secs:.0f}s ({fill_pct*100:.0f}% of {budget_seconds:.0f}s budget)"
        )

        return selected, rejected


# ── Singleton ────────────────────────────────────────────────────────────────
clip_quality_gate = ClipQualityGate()
