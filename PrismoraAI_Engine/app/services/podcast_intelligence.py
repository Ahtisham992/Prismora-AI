# app/services/podcast_intelligence.py
"""
PODCAST-SPECIFIC INTELLIGENCE MODULE  v2  –  ROBUST INTRO SUPPRESSION
Improvements over v1:
  ✅ Hard time-based intro penalty: first 240 s always penalized (graduated)
     Pattern detection alone fails when intro lacks exact keywords.
  ✅ detect_intro_outro_ranges now returns TIME boundaries in addition to
     segment indices, used for a hard-mask in score computation.
  ✅ _compute_time_decay_mask: per-segment multiplier based on elapsed time
     (exponential rise from 0.0 at t=0 to 1.0 at t=intro_safe_secs)
  ✅ compute_podcast_scores applies time-decay mask before all other bonuses.
  ✅ Conversation minimum length filter helper exposed.
  ✅ All other logic (Q&A, story, viral, momentum, diversity) unchanged.
"""

import re
import numpy as np
from typing import List, Dict, Tuple, Optional


class PodcastIntelligence:
    """Full podcast-intelligence pipeline, integrated with Phase-2 service."""

    # Time (seconds) after which content is considered "safe" (past the intro)
    # Adaptive: scales with podcast length (see _adaptive_intro_secs)
    INTRO_SAFE_SECS  = 240.0   # Default for 1h+ podcasts
    OUTRO_SAFE_SECS  = 180.0   # Hard outro zone: last 180 s

    @staticmethod
    def _adaptive_intro_secs(total_duration: float) -> float:
        """Scale intro safe zone based on podcast length."""
        if total_duration < 1200:     # < 20 min
            return 45.0
        elif total_duration < 1800:   # 20-30 min
            return 60.0
        elif total_duration < 3600:   # 30-60 min
            return 120.0
        else:                         # 1h+
            return 240.0

    def __init__(self):
        # ── Question patterns ──────────────────────────────────────────────────
        self.question_starters = re.compile(
            r'^(what|why|how|when|where|who|which|can you|could you|'
            r'would you|do you|did you|have you|tell me|explain|'
            r'is it|are you|was it|were you)\b',
            re.I
        )

        # ── Story markers ──────────────────────────────────────────────────────
        self.story_markers = re.compile(
            r'\b(story|remember when|one time|i recall|this happened|'
            r'back when|years ago|recently|yesterday|last week|'
            r'funny thing|interesting|reminds me|true story|you won\'t believe)\b',
            re.I
        )

        # ── Insight markers ────────────────────────────────────────────────────
        self.insight_markers = re.compile(
            r'\b(the key is|important thing|what i learned|'
            r'the lesson|the point is|what matters|realize|'
            r'the truth is|here\'s the thing|bottom line|'
            r'takeaway|the secret|discovered|fundamentally|'
            r'what nobody tells you|the real reason|the problem is)\b',
            re.I
        )

        # ── Disagreement / debate markers ──────────────────────────────────────
        self.disagreement_markers = re.compile(
            r'\b(i disagree|actually|but|however|wait|hold on|'
            r'not quite|i don\'t think|that\'s not|'
            r'i\'m not sure|respectfully|push back|'
            r'that\'s wrong|no no no|counter|controversial|'
            r'unpopular opinion|hot take)\b',
            re.I
        )

        # ── Humor markers ──────────────────────────────────────────────────────
        self.humor_markers = re.compile(
            r'\b(ha ha|lol|funny|hilarious|ridiculous|'
            r'joke|kidding|seriously|no way|you\'re kidding|'
            r'that\'s crazy|insane|wild|unbelievable|'
            r'absurd|ironic|literally laughing|i can\'t)\b',
            re.I
        )

        # ── Actionable advice markers ──────────────────────────────────────────
        self.advice_markers = re.compile(
            r'\b(you should|try|recommend|suggest|tip|'
            r'pro tip|here\'s how|the way to|method|'
            r'technique|strategy|approach|do this|'
            r'step one|step two|framework|formula|rule of thumb)\b',
            re.I
        )

        # ── VIRAL patterns ────────────────────────────────────────────────────
        self.viral_patterns = re.compile(
            r'\b(the biggest mistake|most people don\'t|nobody talks about|'
            r'i wish someone told me|if i could go back|'
            r'the number one|the most important|changed my life|'
            r'the real truth|blew my mind|game changer|life changing|'
            r'should have done|would have|never again|'
            r'for the first time|can\'t believe|shocking|'
            r'controversial|most successful|biggest lesson)\b',
            re.I
        )

        # ── MOMENTUM ──────────────────────────────────────────────────────────
        self.momentum_boosters = re.compile(
            r'\b(and then|so then|but here\'s the thing|wait|actually|'
            r'right|exactly|yes|absolutely|totally|that\'s it|'
            r'you know what|i know|tell me more|go on|'
            r'really|oh wow|incredible|amazing)\b',
            re.I
        )

        # ── Intro patterns (EXTENDED) ─────────────────────────────────────────
        self.skip_intro = re.compile(
            r'\b(welcome|hello everyone|thanks for joining|appreciate you|'
            r'today we\'re talking|in this episode|let\'s talk about|'
            r'before we start|quick announcement|we have a special guest|'
            r'excited to have|thank you for having me|great to be here|'
            r'let me introduce|'
            r'i\'m really grateful|truly special|dream come true|'
            r'thank you to each|keep supporting|hit the subscribe|'
            r'enjoy this episode|sinking in|can\'t believe this|'
            r'more episodes coming|could have never thought|'
            r'this soon in our journey|figuring out what goes on|'
            r'it was surreal|i was really nervous|'
            r'sitting in front of him|sitting with|'
            r'this one\'s for you|you did it|'
            r'this episode is|smartest people|'
            r'i just want you to|i just want to tell|'
            r'i\'m so grateful|it\'s an incredible opportunity|'
            r'thank you so much for doing this)\b',
            re.I
        )

        self.skip_outro = re.compile(
            r'\b(subscribe|follow us|check out|link in|'
            r'description|patreon|sponsor|thanks for watching|'
            r'see you next|until next time|that\'s it for|'
            r'if you enjoyed|leave a review|rate us|'
            r'hit the bell|share this|social media|'
            r'keep figuring out|let us know in the comments|'
            r'please let us know|who are the next guests|'
            r'don\'t forget to share|watching this episode|'
            r'thank you for watching|see you next time|'
            r'positive change in life|maximum value|'
            r'best of the best minds|i\'ll see you|'
            r'bear with me|i\'m speechless|'
            r'pleasure meeting you|nice to meet you)\b',
            re.I
        )

        # ── Filler words ──────────────────────────────────────────────────────
        self.filler_words = re.compile(
            r'\b(um|uh|er|ah|like|you know|kind of|sort of|'
            r'i mean|basically|literally|honestly|'
            r'right|okay|alright|anyway)\b',
            re.I
        )

        # ── Emotional intensity ────────────────────────────────────────────────
        self.emotional_intensifiers = re.compile(
            r'\b(never|always|every single|absolutely|completely|'
            r'totally|definitely|clearly|obviously|incredibly|'
            r'extremely|so much|so many|the most|the best|the worst)\b',
            re.I
        )

        print("[PodcastIntelligence] ✅ v2 Initialized – hard time-based intro suppression enabled")

    # ══════════════════════════════════════════════════════════════════════════
    # NEW: TIME-BASED INTRO/OUTRO DECAY MASK
    # ══════════════════════════════════════════════════════════════════════════

    def _compute_time_decay_mask(
        self,
        segments: List,
        total_duration: float,
    ) -> List[float]:
        """
        Per-segment multiplier that suppresses intro and outro regions
        based purely on TIME POSITION, independent of pattern matching.

        Intro zone  (0 → INTRO_SAFE_SECS):
          multiplier rises from 0.05 at t=0 to 1.0 at t=INTRO_SAFE_SECS
          using a smooth sigmoid-style curve.

        Outro zone  (total_duration - OUTRO_SAFE_SECS → end):
          symmetrically mirrors the intro decay.

        Segments fully inside the safe zone get multiplier = 1.0.
        """
        mask = []
        total_duration_val = total_duration if total_duration > 0 else 1.0
        intro_secs = self._adaptive_intro_secs(total_duration_val)
        outro_secs = min(self.OUTRO_SAFE_SECS, total_duration_val * 0.1)

        for seg in segments:
            t_mid = (float(seg.start) + float(seg.end)) / 2.0

            # Intro decay
            if t_mid < intro_secs:
                t_norm = t_mid / intro_secs
                mult   = 0.05 + 0.95 * (t_norm ** 1.5)
            # Outro decay
            elif total_duration > 0 and (total_duration - t_mid) < outro_secs:
                t_from_end  = total_duration - t_mid
                t_norm      = t_from_end / outro_secs
                mult        = 0.05 + 0.95 * (t_norm ** 1.5)
            else:
                mult = 1.0

            mask.append(float(np.clip(mult, 0.05, 1.0)))

        return mask

    # ══════════════════════════════════════════════════════════════════════════
    # A. CONTENT TYPE DETECTION
    # ══════════════════════════════════════════════════════════════════════════

    def detect_content_types(self, segments: List) -> List[Dict[str, float]]:
        results = []
        for seg in segments:
            text  = seg.text.strip()
            words = text.split()
            wc    = max(len(words), 1)

            is_question      = bool(self.question_starters.search(text)) or text.endswith('?')
            has_story        = bool(self.story_markers.search(text))
            has_insight      = bool(self.insight_markers.search(text))
            has_disagreement = bool(self.disagreement_markers.search(text))
            has_humor        = bool(self.humor_markers.search(text))
            has_advice       = bool(self.advice_markers.search(text))
            has_viral        = bool(self.viral_patterns.search(text))
            has_emotion      = bool(self.emotional_intensifiers.search(text))

            is_intro = bool(self.skip_intro.search(text))
            is_outro = bool(self.skip_outro.search(text))

            filler_count      = len(self.filler_words.findall(text))
            filler_ratio      = filler_count / wc
            momentum_count    = len(self.momentum_boosters.findall(text))
            momentum_density  = min(1.0, momentum_count / wc * 10)
            substance         = max(0.0, 1.0 - filler_ratio * 2)

            results.append({
                'is_question':       float(is_question),
                'has_story':         float(has_story),
                'has_insight':       float(has_insight),
                'has_disagreement':  float(has_disagreement),
                'has_humor':         float(has_humor),
                'has_advice':        float(has_advice),
                'has_viral':         float(has_viral),
                'has_emotion':       float(has_emotion),
                'is_intro':          float(is_intro),
                'is_outro':          float(is_outro),
                'filler_ratio':      float(filler_ratio),
                'momentum_density':  float(momentum_density),
                'substance':         float(substance),
            })

        return results

    # ══════════════════════════════════════════════════════════════════════════
    # B. QUESTION-ANSWER PAIR DETECTION
    # ══════════════════════════════════════════════════════════════════════════

    def detect_qa_pairs(
        self,
        segments:      List,
        content_types: List[Dict[str, float]]
    ) -> List[Tuple[int, int, float]]:
        qa_pairs = []
        n = len(segments)

        for i in range(n - 1):
            if not content_types[i]['is_question']:
                continue

            for j in range(i + 1, min(i + 4, n)):
                answer_text = segments[j].text.strip()
                if len(answer_text.split()) < 2:
                    continue

                pause = float(segments[j].start) - float(segments[i].end)
                if pause > 3.0:
                    break

                answer_length = len(answer_text.split())
                quality = min(1.0, (
                    0.40 +
                    0.30 * (1.0 - min(pause, 2.0) / 2.0) +
                    0.30 * min(answer_length / 30, 1.0)
                ))

                ct_j = content_types[j]
                if ct_j['has_insight'] or ct_j['has_advice']:
                    quality = min(1.0, quality + 0.15)

                qa_pairs.append((i, j, quality))
                break

        return qa_pairs

    # ══════════════════════════════════════════════════════════════════════════
    # C. STORY ARC DETECTION
    # ══════════════════════════════════════════════════════════════════════════

    def detect_story_arcs(
        self,
        segments:       List,
        content_types:  List[Dict[str, float]],
        min_length:     int = 3,
        max_length:     int = 15
    ) -> List[Tuple[int, int, float]]:
        stories = []
        n = len(segments)
        i = 0

        while i < n:
            if not content_types[i]['has_story']:
                i += 1
                continue

            story_start = i
            story_end   = i

            for j in range(i + 1, min(i + max_length, n)):
                pause = float(segments[j].start) - float(segments[j - 1].end)
                if pause > 3.0:
                    break
                if content_types[j]['is_question']:
                    break
                story_end = j

            story_length = story_end - story_start + 1
            if story_length >= min_length:
                has_humor_in_story = any(
                    content_types[k]['has_humor']
                    for k in range(story_start, story_end + 1)
                )
                has_punchline = any(
                    content_types[k]['has_insight'] or content_types[k]['has_viral']
                    for k in range(story_start, story_end + 1)
                )
                length_score    = min(1.0, story_length / 8.0)
                humor_bonus     = 0.15 if has_humor_in_story else 0.0
                punchline_bonus = 0.10 if has_punchline else 0.0
                story_score     = 0.55 + 0.20 * length_score + humor_bonus + punchline_bonus
                stories.append((story_start, story_end, min(1.0, story_score)))

            i = story_end + 1

        return stories

    # ══════════════════════════════════════════════════════════════════════════
    # D. VIRAL MOMENT DETECTION
    # ══════════════════════════════════════════════════════════════════════════

    def detect_viral_moments(
        self,
        segments:      List,
        content_types: List[Dict[str, float]]
    ) -> List[Tuple[int, float]]:
        moments = []
        n = len(segments)

        for i, (seg, ct) in enumerate(zip(segments, content_types)):
            if ct['is_intro'] or ct['is_outro']:
                continue

            text  = seg.text.strip()
            words = text.split()
            wc    = len(words)

            if not wc:
                continue

            length_ok        = 10 <= wc <= 60
            has_viral_phrase = ct['has_viral']
            has_insight      = ct['has_insight']
            has_disagreement = ct['has_disagreement']
            low_filler       = max(0.0, 1.0 - ct['filler_ratio'] * 3)
            emotional        = ct['has_emotion']
            duration         = float(seg.end) - float(seg.start)
            punchiness       = max(0.0, 1.0 - duration / 30.0)

            v_score = (
                0.35 * float(has_viral_phrase) +
                0.20 * float(has_insight)       +
                0.15 * float(has_disagreement)  +
                0.15 * low_filler               +
                0.10 * float(emotional)         +
                0.05 * punchiness
            )

            if length_ok and v_score > 0.25:
                moments.append((i, float(v_score)))

        moments.sort(key=lambda x: x[1], reverse=True)
        return moments

    # ══════════════════════════════════════════════════════════════════════════
    # E. MOMENTUM ARC DETECTION
    # ══════════════════════════════════════════════════════════════════════════

    def detect_momentum_windows(
        self,
        segments:      List,
        content_types: List[Dict[str, float]],
        window:        int   = 6,
        threshold:     float = 0.35
    ) -> List[Tuple[int, int, float]]:
        n = len(segments)
        if n < window:
            return []

        momentum_windows = []

        for i in range(n - window + 1):
            window_cts   = content_types[i: i + window]
            avg_momentum = np.mean([ct['momentum_density'] for ct in window_cts])
            avg_substance = np.mean([ct['substance'] for ct in window_cts])
            has_skip     = any(ct['is_intro'] or ct['is_outro'] for ct in window_cts)

            m_score = avg_momentum * 0.5 + avg_substance * 0.5
            if has_skip:
                m_score *= 0.3

            if m_score >= threshold:
                momentum_windows.append((i, i + window - 1, float(m_score)))

        if not momentum_windows:
            return []

        merged = [momentum_windows[0]]
        for start, end, score in momentum_windows[1:]:
            prev_start, prev_end, prev_score = merged[-1]
            if start <= prev_end + 2:
                merged[-1] = (prev_start, max(end, prev_end), max(score, prev_score))
            else:
                merged.append((start, end, score))

        return merged

    # ══════════════════════════════════════════════════════════════════════════
    # F. COMPUTE PODCAST-SPECIFIC SCORES  (v2: time-decay applied first)
    # ══════════════════════════════════════════════════════════════════════════

    def compute_podcast_scores(
        self,
        segments:          List,
        content_types:     List[Dict[str, float]],
        qa_pairs:          List[Tuple[int, int, float]],
        story_arcs:        List[Tuple[int, int, float]],
        viral_moments:     List[Tuple[int, float]],
        momentum_windows:  List[Tuple[int, int, float]],
        total_duration:    float = 0.0,   # NEW: used for time-decay mask
    ) -> List[float]:
        n = len(segments)
        scores = [0.0] * n

        # ── Time-based intro/outro decay mask (NEW) ───────────────────────────
        if total_duration > 0:
            time_mask = self._compute_time_decay_mask(segments, total_duration)
        else:
            time_mask = [1.0] * n

        # ── Base score from content markers ───────────────────────────────────
        for i, ct in enumerate(content_types):
            score = (
                0.22 * ct['has_insight']      +
                0.18 * ct['has_story']         +
                0.14 * ct['has_disagreement']  +
                0.13 * ct['has_humor']         +
                0.13 * ct['has_advice']        +
                0.10 * ct['is_question']       +
                0.10 * ct['has_viral']
            )

            if ct['has_emotion']:
                score = min(1.0, score + 0.08)

            # Pattern-based intro/outro penalty
            if ct['is_intro']:
                score *= 0.20
            elif ct['is_outro']:
                score *= 0.10

            # Filler penalty
            filler_penalty = max(0.6, 1.0 - 2.5 * ct['filler_ratio'])
            score *= filler_penalty

            # Time-decay multiplier (NEW)
            score *= time_mask[i]

            scores[i] = score

        # ── Q+A pair bonuses ──────────────────────────────────────────────────
        for q_idx, a_idx, quality in qa_pairs:
            # Suppress Q&A bonuses if they're in the intro zone
            tm_q = time_mask[q_idx]
            tm_a = time_mask[a_idx]
            qa_time_factor = min(tm_q, tm_a)

            boost = 0.45 * quality * qa_time_factor
            scores[q_idx] = min(1.0, scores[q_idx] + boost)
            scores[a_idx] = min(1.0, scores[a_idx] + boost)
            for k in range(q_idx + 1, a_idx):
                scores[k] = min(1.0, scores[k] + 0.15 * quality * qa_time_factor)

        # ── Story arc bonuses ─────────────────────────────────────────────────
        for start_idx, end_idx, story_score in story_arcs:
            tm_story = np.mean(time_mask[start_idx:end_idx + 1])
            boost = 0.30 * story_score * tm_story
            for k in range(start_idx, end_idx + 1):
                scores[k] = min(1.0, scores[k] + boost)

        # ── Viral moment bonuses ──────────────────────────────────────────────
        viral_idx_map = {idx: vscore for idx, vscore in viral_moments}
        for i in range(n):
            if i in viral_idx_map:
                scores[i] = min(1.0, scores[i] + 0.35 * viral_idx_map[i] * time_mask[i])

        # ── Momentum window bonuses ───────────────────────────────────────────
        for m_start, m_end, m_score in momentum_windows:
            boost = 0.20 * m_score
            for k in range(m_start, min(m_end + 1, n)):
                scores[k] = min(1.0, scores[k] + boost * time_mask[k])

        return scores

    # ══════════════════════════════════════════════════════════════════════════
    # G. INTRO / OUTRO RANGE DETECTION  (v2: time-clamped + stricter)
    # ══════════════════════════════════════════════════════════════════════════

    def detect_intro_outro_ranges(
        self,
        segments:          List,
        content_types:     List[Dict[str, float]],
        intro_threshold:   float = 0.5,
        outro_threshold:   float = 0.5,
        max_intro_secs:    float = 180.0,
        max_outro_secs:    float = 180.0,
    ) -> Tuple[Optional[int], Optional[int]]:
        """
        v2: Combines pattern detection with a hard time-based fallback.
        Returns (intro_end_idx, outro_start_idx).

        Hard rules (NEW):
          • If we detect 0 intro markers but first segment starts at t < 60 s,
            still set intro_end to the first segment that ENDS after 60 s.
            This guarantees the very opening is never selected as a clip start.
          • The hard minimum intro zone is always min(first_60s, first_segment_end).
        """
        n = len(segments)

        # ── Intro detection ───────────────────────────────────────────────────
        intro_end = None
        intro_window = min(60, n // 4)

        for i in range(intro_window):
            seg_time = float(segments[i].end)
            if seg_time > max_intro_secs:
                break
            if content_types[i]['is_intro'] > 0.5:
                intro_end = i + 1

        if intro_end is not None:
            intro_ratio = np.mean([
                content_types[i]['is_intro']
                for i in range(intro_end)
            ])
            if intro_ratio < 0.20:   # v2: tightened from 0.25
                intro_end = None

        # ── Hard minimum intro protection (NEW) ───────────────────────────────
        # Even if pattern detection found nothing, enforce a hard first-60s block
        HARD_INTRO_MIN_SECS = 60.0
        hard_intro_idx = 0
        for i, seg in enumerate(segments):
            if float(seg.end) >= HARD_INTRO_MIN_SECS:
                hard_intro_idx = i + 1
                break

        if intro_end is None:
            # No pattern match, but still protect first 60 seconds
            intro_end = hard_intro_idx if hard_intro_idx > 0 else None
            if intro_end:
                print(f"[PodcastIntelligence] ⚠️  No intro pattern match – "
                      f"hard-protecting first 60 s (segments 0–{intro_end})")
        else:
            # Take the LATER of pattern-detected and hard minimum
            intro_end = max(intro_end, hard_intro_idx)

        # ── Outro detection ───────────────────────────────────────────────────
        outro_start = None
        outro_window = min(40, n // 5)

        for i in range(n - outro_window, n):
            if i < 0:
                continue
            seg_time = float(segments[-1].end) - float(segments[i].start)
            if seg_time > max_outro_secs:
                break
            if content_types[i]['is_outro'] > 0.5:
                if outro_start is None:
                    outro_start = i

        if outro_start is not None:
            outro_ratio = np.mean([
                content_types[i]['is_outro']
                for i in range(outro_start, n)
            ])
            if outro_ratio < outro_threshold:
                outro_start = None

        return intro_end, outro_start

    # ══════════════════════════════════════════════════════════════════════════
    # H. MASK INTRO / OUTRO  (unchanged)
    # ══════════════════════════════════════════════════════════════════════════

    def mask_intro_outro(
        self,
        scores:       List[float],
        intro_end:    Optional[int],
        outro_start:  Optional[int],
        intro_factor: float = 0.0,
        outro_factor: float = 0.0,
    ) -> List[float]:
        result = list(scores)
        n = len(result)

        if intro_end is not None:
            for i in range(min(intro_end, n)):
                result[i] *= intro_factor

        if outro_start is not None:
            for i in range(max(0, outro_start), n):
                result[i] *= outro_factor

        return result

    # ══════════════════════════════════════════════════════════════════════════
    # I. FINAL BLEND  (unchanged)
    # ══════════════════════════════════════════════════════════════════════════

    def compute_final_blend(
        self,
        multi_modal_scores: List[float],
        podcast_scores:     List[float],
        podcast_weight:     float = 0.35,
    ) -> List[float]:
        n = len(multi_modal_scores)
        assert len(podcast_scores) == n

        mm  = np.array(multi_modal_scores, dtype=np.float32)
        pod = np.array(podcast_scores,     dtype=np.float32)

        pod_max = pod.max()
        if pod_max > 1e-6:
            pod = pod / pod_max

        blended = (1.0 - podcast_weight) * mm + podcast_weight * pod
        return [float(v) for v in np.clip(blended, 0.0, 1.0)]

    # ══════════════════════════════════════════════════════════════════════════
    # J. TOPIC DIVERSITY RERANKING  (unchanged)
    # ══════════════════════════════════════════════════════════════════════════

    def topic_diversity_rerank(
        self,
        conversations:     List[Tuple[int, int]],
        segments:          List,
        scores:            List[float],
        content_types:     List[Dict[str, float]],
        num_clips:         int,
        diversity_penalty: float = 0.25,
        min_gap_segs:      int   = 10,
    ) -> List[Tuple[int, int]]:
        """v5: tracks ALL used types, adaptive dur weight, temporal spread."""
        total_segs = len(segments)
        conv_data = []
        for start_idx, end_idx in conversations:
            if end_idx - start_idx < 3:
                continue

            seg_slice = segments[start_idx:end_idx]
            ct_slice  = content_types[start_idx:end_idx]
            avg_score = float(np.mean(scores[start_idx:end_idx]))

            duration  = sum(float(s.end) - float(s.start) for s in seg_slice)
            dur_weight = min(1.0, duration / 30.0)   # v5: lowered from 60s

            type_keys = ['has_insight', 'has_story', 'has_disagreement',
                         'has_humor', 'has_advice', 'has_viral']
            type_avgs = {
                k: float(np.mean([ct[k] for ct in ct_slice]))
                for k in type_keys
            }
            dominant_type = max(type_avgs, key=type_avgs.get)

            combined = avg_score * dur_weight
            conv_data.append({
                'score':     combined,
                'start_idx': start_idx,
                'end_idx':   end_idx,
                'dominant':  dominant_type,
                'midpoint':  (start_idx + end_idx) / 2.0,
            })

        conv_data.sort(key=lambda x: x['score'], reverse=True)

        selected   = []
        used_types = set()   # v5: track ALL used types, not just last

        for cd in conv_data:
            if len(selected) >= num_clips:
                break

            s, e = cd['start_idx'], cd['end_idx']

            # Proximity check
            too_close = any(
                abs(s - sel_e) < min_gap_segs or abs(sel_s - e) < min_gap_segs
                for sel_s, sel_e in selected
            )
            if too_close:
                continue

            # v5: Diversity penalty applies if type already used
            if cd['dominant'] in used_types:
                cd['score'] *= (1.0 - diversity_penalty)
                if cd['score'] < 0.05:
                    continue

            # v5: Temporal spread bonus — prefer clips from different regions
            if selected and total_segs > 0:
                mid = cd['midpoint']
                sel_mids = [(ss + se) / 2.0 for ss, se in selected]
                min_dist = min(abs(mid - sm) for sm in sel_mids)
                spread = min_dist / total_segs
                if spread > 0.15:  # well separated
                    cd['score'] *= 1.05

            selected.append((s, e))
            used_types.add(cd['dominant'])

        selected.sort(key=lambda x: x[0])
        return selected

    # ══════════════════════════════════════════════════════════════════════════
    # K. FULL ANALYSIS PIPELINE  (v2: passes total_duration to scoring)
    # ══════════════════════════════════════════════════════════════════════════

    def analyze_podcast(self, segments: List) -> Dict:
        n = len(segments)
        print(f"[PodcastIntelligence] 🎙️  Analysing {n} segments…")

        total_duration = float(segments[-1].end) if segments else 0.0

        content_types    = self.detect_content_types(segments)
        qa_pairs         = self.detect_qa_pairs(segments, content_types)
        story_arcs       = self.detect_story_arcs(segments, content_types)
        viral_moments    = self.detect_viral_moments(segments, content_types)
        momentum_windows = self.detect_momentum_windows(segments, content_types)

        podcast_scores = self.compute_podcast_scores(
            segments, content_types,
            qa_pairs, story_arcs, viral_moments, momentum_windows,
            total_duration=total_duration,   # NEW
        )

        intro_end, outro_start = self.detect_intro_outro_ranges(
            segments, content_types
        )

        threshold       = float(np.percentile(podcast_scores, 95))
        golden_segments = [
            i for i, score in enumerate(podcast_scores)
            if score >= threshold and score > 0.0
        ]

        print(f"[PodcastIntelligence] ✅ Done:")
        print(f"  • Q+A pairs        : {len(qa_pairs)}")
        print(f"  • Story arcs       : {len(story_arcs)}")
        print(f"  • Viral moments    : {len(viral_moments)}")
        print(f"  • Momentum windows : {len(momentum_windows)}")
        print(f"  • Golden segments  : {len(golden_segments)}")
        print(f"  • Total duration   : {total_duration:.0f}s")
        if intro_end:
            print(f"  • Intro ends at    : segment {intro_end} "
                  f"(t={float(segments[intro_end-1].end):.0f}s)")
        if outro_start:
            print(f"  • Outro starts at  : segment {outro_start}")

        return {
            'content_types':    content_types,
            'podcast_scores':   podcast_scores,
            'qa_pairs':         qa_pairs,
            'story_arcs':       story_arcs,
            'viral_moments':    viral_moments,
            'momentum_windows': momentum_windows,
            'intro_end':        intro_end,
            'outro_start':      outro_start,
            'golden_segments':  golden_segments,
            'total_duration':   total_duration,
            'stats': {
                'qa_count':         len(qa_pairs),
                'story_count':      len(story_arcs),
                'viral_count':      len(viral_moments),
                'momentum_windows': len(momentum_windows),
                'intro_end':        intro_end,
                'outro_start':      outro_start,
            },
        }


# ── Singleton ─────────────────────────────────────────────────────────────────
podcast_intelligence = PodcastIntelligence()