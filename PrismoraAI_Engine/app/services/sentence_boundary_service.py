# app/services/sentence_boundary_service.py
"""
SENTENCE BOUNDARY SERVICE  v2  –  SMART CLIP WINDOWING
Major improvements over v1:
  ✅ find_complete_window uses boundary-quality scoring, not just total score
  ✅ Windows can extend up to 30 s beyond conversation boundary to find clean exit
  ✅ _find_clean_exit_point replaces _avoid_ending_on_question with full coverage:
       – ends mid-sentence (no punctuation) → seek forward
       – ends on question                   → extend to include answer
       – ends mid-story                     → extend to story end
  ✅ _score_clip_boundaries: rates start + end quality independently
  ✅ snap_to_sentence_boundary: unchanged (already correct)
"""

import re
from typing import List, Dict, Tuple, Optional

_SENT_END  = re.compile(r'[.!?]$')
_STRONG_END = re.compile(r'[.!]$')   # period or exclamation = solid end
_TOPIC_STARTERS = re.compile(
    r'^(so|but|now|okay|alright|well|anyway|right|listen|look|actually|'
    r'basically|honestly|i mean|the thing is|what i|let me|here\'s)\b',
    re.I
)
_CONCLUSION_WORDS = re.compile(
    r'\b(so that\'s|and that\'s|which is why|in conclusion|to summarise|'
    r'at the end of the day|the bottom line|long story short|'
    r'that\'s basically|that\'s essentially|that\'s the|that\'s what|'
    r'makes sense|does that make sense|you know what i mean|'
    r'right\?|yeah\?|okay\?)\b',
    re.I
)
# Mid-sentence indicators – clip should NOT end here
_MID_SENTENCE = re.compile(r'(,|and$|but$|or$|so$|because$|that$|which$|who$|when$|if$)', re.I)


class SentenceBoundaryService:
    """
    Builds a sentence map from Whisper segments and exposes snap utilities.
    """

    # ──────────────────────────────────────────────────────────────────
    def build_sentence_map(self, segments: List) -> List[Dict]:
        """
        Group Whisper segments into complete sentences / thoughts.

        Each entry:
        {
            'start': float, 'end': float, 'text': str,
            'seg_start_idx': int, 'seg_end_idx': int, 'complete': bool
        }
        """
        if not segments:
            return []

        sentences: List[Dict] = []
        current_start_idx = 0
        buf_text: List[str] = []
        sent_start = float(segments[0].start)

        for i, seg in enumerate(segments):
            text = seg.text.strip()
            if not text:
                continue

            buf_text.append(text)
            sent_end = float(seg.end)

            is_end = False
            if _SENT_END.search(text):
                is_end = True

            if i < len(segments) - 1:
                next_seg = segments[i + 1]
                pause = float(next_seg.start) - sent_end
                if pause > 1.5:
                    is_end = True
                if _TOPIC_STARTERS.search(segments[i + 1].text.strip()):
                    is_end = True

            if is_end or i == len(segments) - 1:
                sentences.append({
                    'start':         sent_start,
                    'end':           sent_end,
                    'text':          ' '.join(buf_text),
                    'seg_start_idx': current_start_idx,
                    'seg_end_idx':   i,
                    'complete':      bool(_SENT_END.search(text)),
                })
                if i < len(segments) - 1:
                    current_start_idx = i + 1
                    buf_text = []
                    sent_start = float(segments[i + 1].start)

        return sentences

    # ──────────────────────────────────────────────────────────────────
    def snap_to_sentence_boundary(
        self,
        clip_start: float,
        clip_end:   float,
        sentence_map: List[Dict],
        tolerance:  float = 2.0
    ) -> Tuple[float, float]:
        if not sentence_map:
            return clip_start, clip_end

        snapped_start = clip_start
        for sent in sentence_map:
            if sent['start'] <= clip_start <= sent['end']:
                snapped_start = sent['start']
                break
        else:
            nearest = min(sentence_map, key=lambda s: abs(s['start'] - clip_start))
            if abs(nearest['start'] - clip_start) <= tolerance:
                snapped_start = nearest['start']

        snapped_end = clip_end
        for sent in reversed(sentence_map):
            if sent['start'] <= clip_end <= sent['end']:
                snapped_end = sent['end']
                break
        else:
            nearest = min(sentence_map, key=lambda s: abs(s['end'] - clip_end))
            if abs(nearest['end'] - clip_end) <= tolerance:
                snapped_end = nearest['end']

        if snapped_end <= snapped_start:
            snapped_end = clip_end
            snapped_start = clip_start

        return snapped_start, snapped_end

    # ──────────────────────────────────────────────────────────────────
    # NEW: Score how good a clip's start and end positions are
    # ──────────────────────────────────────────────────────────────────
    def _score_clip_start(self, seg_idx: int, segments: List) -> float:
        """
        Returns 0.0–1.0. High = clean natural start.
        v5: added continuation penalty for mid-answer starts.
        """
        if seg_idx == 0:
            return 0.50

        prev = segments[seg_idx - 1]
        curr = segments[seg_idx]
        pause = float(curr.start) - float(prev.end)
        prev_text = prev.text.strip()
        curr_text = curr.text.strip()

        score = 0.30  # baseline
        if pause >= 2.0:
            score += 0.35
        elif pause >= 1.0:
            score += 0.20
        elif pause >= 0.5:
            score += 0.10

        if _STRONG_END.search(prev_text):
            score += 0.30
        elif prev_text.endswith('?'):
            score -= 0.10

        if _TOPIC_STARTERS.search(curr_text):
            score += 0.20

        # v5: Continuation detection — penalize starting mid-answer
        if (curr_text and curr_text[0].islower() and
            pause < 0.8 and not _TOPIC_STARTERS.search(curr_text)):
            score -= 0.30

        return float(min(1.0, max(0.0, score)))

    def _score_clip_end(self, seg_idx: int, segments: List) -> float:
        """
        Returns 0.0–1.0. High = clean, complete ending.
        Rules:
          • Ends with '.' or '!'                  → +0.50 (ideal)
          • Has conclusion word/phrase             → +0.20
          • Very next segment has long pause       → +0.15
          • Ends with '?'                          → -0.60 (terrible)
          • Ends mid-sentence (,  and/but/or …)   → -0.40
          • No punctuation at all                  → -0.20
        """
        if seg_idx >= len(segments):
            return 0.30

        text = segments[seg_idx].text.strip()
        score = 0.30  # baseline

        if _STRONG_END.search(text):
            score += 0.50
        elif text.endswith('?'):
            score -= 0.60
        elif not _SENT_END.search(text):
            score -= 0.20
            if _MID_SENTENCE.search(text):
                score -= 0.20

        if _CONCLUSION_WORDS.search(text):
            score += 0.20

        # Pause to next segment
        if seg_idx + 1 < len(segments):
            nxt = segments[seg_idx + 1]
            gap = float(nxt.start) - float(segments[seg_idx].end)
            if gap >= 2.0:
                score += 0.15
            elif gap >= 1.0:
                score += 0.08

        return float(min(1.0, max(0.0, score)))

    # ──────────────────────────────────────────────────────────────────
    # MAIN: Find best complete clip window
    # ──────────────────────────────────────────────────────────────────
    def find_complete_window(
        self,
        segments:       List,
        scores:         List[float],
        sentence_map:   List[Dict],
        start_idx:      int,
        end_idx:        int,
        target_seconds: float,
        speech_buffer:  float = 0.5,
        qa_pairs:       List  = None,
        # NEW: allow extending beyond conversation boundary to find clean exit
        exit_search_secs: float = 30.0,
    ) -> Tuple[float, float]:
        """
        Within segment range [start_idx, end_idx), find the highest-quality
        contiguous window of ~target_seconds that:
          1. Starts on a clean boundary (after a pause, after punctuation)
          2. Ends on a complete sentence (not a question, not mid-sentence)
          3. Contains high-scoring content
          4. Respects Q→A pairs (never split them)

        Key improvement over v1:
          • Each candidate window is scored on content AND boundary quality.
          • We can look up to `exit_search_secs` beyond end_idx to find a
            better clip exit (avoids being trapped in a conversation that
            ends mid-thought).
        """
        n_segs = len(segments)

        # Extended search boundary: look beyond conv end for clean exit
        extended_end = min(
            n_segs,
            end_idx + self._secs_to_seg_count(exit_search_secs, segments, end_idx)
        )

        best: Optional[Tuple[float, int, int]] = None  # (combined_score, i, j-1)

        for i in range(start_idx, end_idx):
            total_time   = 0.0
            content_sum  = 0.0
            j = i

            # Accumulate until target duration, allow slight overshoot
            while j < extended_end and total_time < target_seconds * 1.10:
                s = segments[j]
                seg_dur = float(s.end) - float(s.start)
                total_time  += seg_dur
                content_sum += float(scores[j])
                j += 1

                # Once we've hit at least 70% of target, check exit quality
                if total_time >= target_seconds * 0.70:
                    end_score   = self._score_clip_end(j - 1, segments)
                    start_score = self._score_clip_start(i, segments)

                    # Content quality: avg score of segments in window
                    content_qual = content_sum / max(1, j - i)

                    # v5: Hard-reject bad endings
                    if end_score < 0.30:
                        continue

                    # v5: Balanced scoring: content 40%, end 40%, start 20%
                    combined = (
                        0.40 * content_qual +
                        0.40 * end_score    +
                        0.20 * start_score
                    )

                    if best is None or combined > best[0]:
                        best = (combined, i, j - 1)

                    # Stop accumulating once we're well past target
                    if total_time >= target_seconds * 1.30:
                        break

        if best is None:
            # Fallback: entire range, snapped
            raw_start = float(segments[start_idx].start)
            raw_end   = float(segments[min(end_idx, n_segs) - 1].end)
            t_start, t_end = self.snap_to_sentence_boundary(
                raw_start, raw_end, sentence_map
            )
            return max(0.0, t_start - speech_buffer), t_end

        _, best_i, best_j = best
        raw_start = float(segments[best_i].start)
        raw_end   = float(segments[best_j].end)

        # Snap to sentence boundaries
        t_start, t_end = self.snap_to_sentence_boundary(
            raw_start, raw_end, sentence_map
        )

        # Protect Q→A pairs (v5: extended to 40s)
        if qa_pairs:
            t_start, t_end = self._protect_qa_pairs(
                t_start, t_end, segments, qa_pairs, max_extension=40.0
            )

        # Find cleanest exit point near t_end (forward search, up to 45s)
        t_end, end_score = self._find_clean_exit_point(
            t_end, segments, max_search_secs=45.0
        )

        # ── NEW: Backward shrink fallback ─────────────────────────────
        # If forward search still left a weak ending, walk BACKWARD to the
        # last clean sentence boundary (≤ 20s shrink, keeps ≥ 70% duration).
        if end_score < 0.55:
            shrunk, shrunk_score = self._shrink_to_clean_end(
                t_end, t_start, segments, max_shrink_secs=20.0
            )
            if shrunk_score > end_score and (t_end - shrunk) <= 20.0:
                clip_min = (t_end - t_start) * 0.70
                if (shrunk - t_start) >= clip_min:
                    print(
                        f"    [ClipShrink] ✂️  Shrunk end by -{t_end - shrunk:.1f}s "
                        f"(end_score {end_score:.2f}→{shrunk_score:.2f})"
                    )
                    t_end = shrunk

        # Small speech buffer at start
        t_start = max(0.0, t_start - speech_buffer)

        return t_start, t_end

    # ──────────────────────────────────────────────────────────────────
    # IMPROVED: Find the cleanest exit point near a target end time
    # ──────────────────────────────────────────────────────────────────
    def _find_clean_exit_point(
        self,
        t_end:           float,
        segments:        List,
        max_search_secs: float = 30.0,
    ) -> float:
        """
        Starting from t_end, search forward (up to max_search_secs) for the
        best "clean exit" point defined as:
          • Ends on '.' or '!'  (not '?', not mid-sentence)
          • Has a pause to next segment OR is the last segment in a thought

        If the current t_end is already clean, returns it immediately.
        Otherwise seeks forward up to max_search_secs.
        Fallback: if nothing better found within search window, returns t_end.
        """
        # Find the segment whose end is closest to t_end
        best_idx, best_diff = None, float('inf')
        for i, seg in enumerate(segments):
            diff = abs(float(seg.end) - t_end)
            if diff < best_diff:
                best_diff = diff
                best_idx = i

        if best_idx is None or best_diff > 3.0:
            return t_end, 0.50  # unknown score, treat as neutral

        # If current end is already clean, return immediately
        end_score = self._score_clip_end(best_idx, segments)
        if end_score >= 0.65:
            return t_end, end_score

        # Search forward for best exit within window
        best_exit_score = end_score
        best_exit_time  = t_end
        n = len(segments)

        for k in range(best_idx + 1, n):
            seg_time = float(segments[k].end)
            if seg_time - t_end > max_search_secs:
                break

            # Gap to previous (large gap = natural pause = good exit)
            gap = float(segments[k].start) - float(segments[k - 1].end)

            # v5: Prefer exits with long pause > 2s (natural conversation break)
            if gap > 2.0:
                exit_score = self._score_clip_end(k - 1, segments)
                # Bonus for pause-based exit
                exit_score = min(1.0, exit_score + 0.10)
                if exit_score > best_exit_score:
                    best_exit_score = exit_score
                    best_exit_time  = float(segments[k - 1].end)

            exit_score = self._score_clip_end(k, segments)
            if exit_score > best_exit_score:
                best_exit_score = exit_score
                best_exit_time  = float(segments[k].end)

            # Good enough → take it
            if best_exit_score >= 0.75:
                break

        if best_exit_time != t_end:
            delta = best_exit_time - t_end
            print(
                f"    [ClipExit] ✅ Moved clip end by +{delta:.1f}s "
                f"(exit_score={best_exit_score:.2f}, "
                f"was: \"{segments[best_idx].text.strip()[:50]}\")"
            )

        return best_exit_time, best_exit_score

    # ──────────────────────────────────────────────────────────────────
    # NEW: Backward shrink — walk back to last clean sentence ending
    # ──────────────────────────────────────────────────────────────────
    def _shrink_to_clean_end(
        self,
        t_end:            float,
        t_start:          float,
        segments:         List,
        max_shrink_secs:  float = 20.0,
        min_end_score:    float = 0.60,
    ) -> Tuple[float, float]:
        """
        Walk BACKWARD from t_end in segment steps.
        Stops at the first segment that ends cleanly (score >= min_end_score).
        Never shrinks more than max_shrink_secs.
        Returns (best_time, best_score).
        """
        # Collect segments inside this window
        inside = [
            (i, seg) for i, seg in enumerate(segments)
            if float(seg.start) >= t_start and float(seg.end) <= t_end + 0.5
        ]
        if not inside:
            return t_end, 0.0

        best_time  = t_end
        best_score = 0.0

        # Walk backwards through segments (skip last — that's the problem)
        for i, seg in reversed(inside[:-1]):
            if t_end - float(seg.end) > max_shrink_secs:
                break

            sc = self._score_clip_end(i, segments)
            if sc > best_score:
                best_score = sc
                best_time  = float(seg.end)

            # Good enough → stop
            if best_score >= min_end_score:
                break

        return best_time, best_score

    # ──────────────────────────────────────────────────────────────────
    # Q&A Protection (unchanged from v1, just cleaned up)
    # ──────────────────────────────────────────────────────────────────
    def _protect_qa_pairs(
        self,
        t_start:       float,
        t_end:         float,
        segments:      List,
        qa_pairs:      List,
        max_extension: float = 25.0,
    ) -> Tuple[float, float]:
        for qa in qa_pairs:
            q_idx, a_idx = qa[0], qa[1]
            q_start = float(segments[q_idx].start)
            a_end   = float(segments[a_idx].end)

            # Extend answer end to include following non-question segments
            j = a_idx + 1
            while j < len(segments) and j <= a_idx + 5:
                next_text = segments[j].text.strip()
                gap = float(segments[j].start) - float(segments[j - 1].end)
                if next_text.endswith('?') or gap > 2.0:
                    break
                a_end = float(segments[j].end)
                j += 1

            # Case 1: clip contains question but not full answer
            if t_start <= q_start and t_end >= q_start and t_end < a_end:
                if (a_end - t_end) <= max_extension:
                    t_end = a_end

            # Case 2: clip contains answer but starts after question
            if t_start > q_start and t_start <= float(segments[a_idx].start) and t_end >= a_end:
                if (t_start - q_start) <= max_extension:
                    t_start = q_start

        return t_start, t_end

    # ──────────────────────────────────────────────────────────────────
    # Helper: estimate segment count for N seconds from a position
    # ──────────────────────────────────────────────────────────────────
    def _secs_to_seg_count(
        self, secs: float, segments: List, from_idx: int
    ) -> int:
        """Estimate how many segments cover `secs` seconds starting from from_idx."""
        if not segments or from_idx >= len(segments):
            return 15  # fallback estimate
        total = 0.0
        count = 0
        for i in range(from_idx, len(segments)):
            total += float(segments[i].end) - float(segments[i].start)
            count += 1
            if total >= secs:
                break
        return max(count, 5)

    # ──────────────────────────────────────────────────────────────────
    # Legacy: kept for compatibility – internally calls new method
    # ──────────────────────────────────────────────────────────────────
    def _avoid_ending_on_question(
        self,
        t_end:    float,
        segments: List,
        max_extension: float = 15.0,
        quiet: bool = False,
    ) -> float:
        """Deprecated stub – redirects to _find_clean_exit_point."""
        t, _ = self._find_clean_exit_point(t_end, segments, max_search_secs=max_extension)
        return t

    # ------------------------------------------------------------------
    # v5: CLIP COMPLETENESS VALIDATION
    # ------------------------------------------------------------------
    def validate_clip_completeness(
        self,
        t_start:  float,
        t_end:    float,
        segments: List,
        qa_pairs: List = None,
    ) -> tuple:
        """
        Post-extraction validation that a clip window contains complete
        conversational exchanges.

        Returns (is_valid: bool, issues: list[str])
        """
        issues = []

        # Find segments within this clip window
        clip_segs = [
            (i, seg) for i, seg in enumerate(segments)
            if float(seg.start) >= t_start - 0.5 and float(seg.end) <= t_end + 0.5
        ]
        if not clip_segs:
            return False, ['no_segments_in_window']

        first_idx, first_seg = clip_segs[0]
        last_idx, last_seg   = clip_segs[-1]
        first_text = first_seg.text.strip()
        last_text  = last_seg.text.strip()

        # Check 1: First segment doesn't start mid-continuation
        if (first_text and first_text[0].islower() and first_idx > 0):
            prev_text = segments[first_idx - 1].text.strip()
            pause = float(first_seg.start) - float(segments[first_idx - 1].end)
            if pause < 0.8 and not prev_text.endswith(('.', '!', '?')):
                issues.append('starts_mid_sentence')

        # Check 2: Last segment ends with . or ! (not ? or comma)
        if last_text.endswith('?'):
            # Question at end = incomplete (where's the answer?)
            issues.append('ends_on_question')
        elif not _STRONG_END.search(last_text):
            if _MID_SENTENCE.search(last_text):
                issues.append('ends_mid_sentence')
            elif not _SENT_END.search(last_text):
                issues.append('no_ending_punctuation')

        # Check 3: No orphaned question at end without answer
        if qa_pairs:
            for qa in qa_pairs:
                q_idx, a_idx = qa[0], qa[1]
                q_time = float(segments[q_idx].start)
                a_time = float(segments[a_idx].end)
                # Question inside clip but answer outside
                if t_start <= q_time <= t_end and a_time > t_end + 1.0:
                    issues.append('orphaned_question')
                    break

        is_valid = len(issues) == 0
        return is_valid, issues


# Singleton
sentence_boundary_service = SentenceBoundaryService()