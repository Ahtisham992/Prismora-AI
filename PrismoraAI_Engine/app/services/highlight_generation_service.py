# app/services/highlight_generation_service.py
"""
HIGHLIGHT GENERATION SERVICE  v5  –  DYNAMIC CLIP-ONLY
Fully dynamic clip count based on content quality.
Complete conversation enforcement with LLM quality gate.
Each selected clip is extracted and uploaded to Cloudinary individually.
Merging is a separate step handled by FusionService via /fuse-clips.

Pipeline (10 steps):
  ① Sentence boundary map
  ② Conversation boundary detection  (merges short conversations)
  ③ Transcript analysis    (GPU embeddings – MiniLM)
  ④ Audio + Video analysis (PARALLEL threads)
  ⑤ Podcast Intelligence   (Q&A / story / viral / momentum)
  ⑥ Multi-modal fusion     (GPU – VADER + question + A/V + podcast blend)
  ⑦ Dynamic clip selection  (quality threshold + greedy budget packing)
  ⑧ Diversity-aware reranking
  ⑨ Sentence-complete windows → extract → validate → upload EACH clip
  ⑨½ LLM Quality Gate (optional – Groq)
"""

import os
import subprocess
import time
import numpy as np
import torch
from concurrent.futures import ThreadPoolExecutor
from typing import List, Tuple, Dict, Optional

from sentence_transformers import SentenceTransformer, util

from app.services.audio_analyzer             import audio_analyzer
from app.services.video_analyzer             import video_analyzer
from app.services.multi_modal_scorer         import multi_modal_scorer
from app.services.sentence_boundary_service  import sentence_boundary_service
from app.services.podcast_intelligence       import podcast_intelligence
from app.services.clip_quality_gate          import clip_quality_gate
from app.utils.cloudinary_utils              import upload_to_cloudinary
from app.core.config                         import settings


_FFMPEG_DIR = settings.FFMPEG_BIN_DIR
_EXE        = ".exe" if os.name == "nt" else ""
FFMPEG      = os.path.join(_FFMPEG_DIR, f"ffmpeg{_EXE}")
FFPROBE     = os.path.join(_FFMPEG_DIR, f"ffprobe{_EXE}")

_DURATION_MAP  = {"1m": 60, "3m": 180, "5m": 300, "10m": 600}
MIN_CONV_SECS  = 25.0   # merge conversations shorter than this


class HighlightGenerationService:

    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"

        if self.device == "cpu":
            print("\n" + "⚠" * 35)
            print("[Phase2] WARNING: No CUDA GPU detected. Running on CPU.")
            print("⚠" * 35 + "\n")

        if self.device == "cuda":
            gpu_name = torch.cuda.get_device_name(0)
            gpu_gb   = torch.cuda.get_device_properties(0).total_memory / 1024 ** 3
        else:
            gpu_name, gpu_gb = "CPU (no GPU)", 0.0

        print("=" * 70)
        print("[Highlight] 🚀 HIGHLIGHT ENGINE  v5  (dynamic clip-only)")
        print(f"[Phase2] GPU  : {gpu_name} ({gpu_gb:.1f} GB)")
        print("=" * 70)

        self.embedding_model = SentenceTransformer(
            "all-MiniLM-L6-v2", device=self.device
        )
        print("[Phase2] ✅ Embedding model loaded (all-MiniLM-L6-v2)")

    # ══════════════════════════════════════════════════════════════════════════
    # UTILITIES
    # ══════════════════════════════════════════════════════════════════════════

    def parse_duration(self, duration_str: str) -> int:
        if duration_str not in _DURATION_MAP:
            raise ValueError(
                f"Invalid duration '{duration_str}'. Allowed: {list(_DURATION_MAP)}"
            )
        return _DURATION_MAP[duration_str]

    # ══════════════════════════════════════════════════════════════════════════
    # STEP 1 – SENTENCE MAP
    # ══════════════════════════════════════════════════════════════════════════

    def _build_sentence_map(self, segments: List) -> List[Dict]:
        return sentence_boundary_service.build_sentence_map(segments)

    # ══════════════════════════════════════════════════════════════════════════
    # STEP 2 – CONVERSATION BOUNDARIES  (merges short convs)
    # ══════════════════════════════════════════════════════════════════════════

    def _detect_conversation_boundaries(
        self, segments: List
    ) -> List[Tuple[int, int]]:
        raw: List[Tuple[int, int]] = []
        current_start = 0

        for i in range(1, len(segments)):
            prev     = segments[i - 1]
            curr     = segments[i]
            pause    = float(curr.start) - float(prev.end)
            prev_txt = prev.text.strip()

            boundary = (
                pause > 2.5 or
                (pause > 1.2 and prev_txt.endswith(('.', '!', '?'))) or
                (prev_txt.endswith('?') and pause > 0.7)
            )
            if boundary:
                raw.append((current_start, i))
                current_start = i

        raw.append((current_start, len(segments)))

        # Merge conversations shorter than MIN_CONV_SECS
        merged: List[Tuple[int, int]] = []
        for (s, e) in raw:
            dur = sum(
                float(segments[k].end) - float(segments[k].start)
                for k in range(s, e)
            )
            if dur < MIN_CONV_SECS and merged:
                prev_s, prev_e = merged[-1]
                merged[-1] = (prev_s, e)
            else:
                merged.append((s, e))

        if len(merged) >= 2:
            last_s, last_e = merged[-1]
            last_dur = sum(
                float(segments[k].end) - float(segments[k].start)
                for k in range(last_s, last_e)
            )
            if last_dur < MIN_CONV_SECS:
                prev_s, prev_e = merged[-2]
                merged[-2] = (prev_s, last_e)
                merged.pop()

        print(
            f"[Phase2]   Raw conversations: {len(raw)} → "
            f"After merge (min {MIN_CONV_SECS}s): {len(merged)}"
        )
        return merged

    # ══════════════════════════════════════════════════════════════════════════
    # STEP 3 – TRANSCRIPT FEATURES
    # ══════════════════════════════════════════════════════════════════════════

    def _compute_transcript_features(
        self, segments: List, suggestion: Optional[str]
    ) -> Tuple[List[float], List[float]]:
        texts = [seg.text for seg in segments]
        n     = len(texts)

        with torch.no_grad():
            embeddings = self.embedding_model.encode(
                texts,
                convert_to_tensor=True,
                show_progress_bar=False,
                batch_size=256,
                device=self.device,
            )
            ctx_win = 2
            pad     = torch.zeros(ctx_win, embeddings.shape[1],
                                  device=self.device, dtype=embeddings.dtype)
            padded  = torch.cat([pad, embeddings, pad], dim=0)

            semantic_scores = [
                float(util.cos_sim(embeddings[i:i+1],
                                   padded[i: i + 2 * ctx_win + 1]).mean())
                for i in range(n)
            ]

            if suggestion and suggestion.strip():
                sug_emb = self.embedding_model.encode(
                    suggestion, convert_to_tensor=True
                )
                suggestion_scores = (
                    util.cos_sim(embeddings, sug_emb)
                    .cpu().numpy().flatten().tolist()
                )
            else:
                suggestion_scores = [0.0] * n

        return semantic_scores, suggestion_scores

    # ══════════════════════════════════════════════════════════════════════════
    # STEP 4 – PARALLEL AUDIO + VIDEO
    # ══════════════════════════════════════════════════════════════════════════

    def _compute_audio_video_parallel(
        self, audio_path: str, video_path: str,
        segments: List, demo_mode: bool,
    ) -> Tuple[List[Dict], List[Dict], List[float]]:
        audio_result = [None]
        video_result = [None, []]

        def run_audio():
            feats = audio_analyzer.analyze_all_segments_parallel(
                audio_path, segments, max_workers=4
            )
            audio_result[0] = audio_analyzer.normalize_features(feats)

        def run_video():
            if demo_mode:
                zeros = [video_analyzer._zero_features() for _ in segments]
                video_result[0] = video_analyzer.normalize_features(zeros)
                video_result[1] = []
            else:
                feats, scenes = video_analyzer.analyze_all_segments(
                    video_path, segments, sample_rate=5
                )
                video_result[0] = video_analyzer.normalize_features(feats)
                video_result[1] = scenes

        with ThreadPoolExecutor(max_workers=2) as pool:
            fa = pool.submit(run_audio)
            fv = pool.submit(run_video)
            fa.result(); fv.result()

        return audio_result[0], video_result[0], video_result[1]

    # ══════════════════════════════════════════════════════════════════════════
    # STEP 5 – PODCAST INTELLIGENCE
    # ══════════════════════════════════════════════════════════════════════════

    def _run_podcast_intelligence(self, segments: List) -> Dict:
        return podcast_intelligence.analyze_podcast(segments)

    # ══════════════════════════════════════════════════════════════════════════
    # STEP 6 – MULTI-MODAL FUSION
    # ══════════════════════════════════════════════════════════════════════════

    def _fuse_and_score(
        self, segments: List,
        semantic_scores: List[float], suggestion_scores: List[float],
        audio_features: List[Dict], video_features: List[Dict],
        pi_result: Dict,
    ) -> Tuple[List[float], Dict]:
        texts             = [seg.text for seg in segments]
        confidence_scores = [float(getattr(seg, 'confidence', 0.5)) for seg in segments]

        raw_scores = multi_modal_scorer.compute_multi_modal_scores(
            semantic_scores, suggestion_scores,
            audio_features, video_features,
            confidence_scores, texts=texts,
        )
        mm_scores = multi_modal_scorer.boost_complete_conversations(
            raw_scores, segments, boost_factor=1.15
        )
        blended = podcast_intelligence.compute_final_blend(
            mm_scores, pi_result['podcast_scores'], podcast_weight=0.35
        )
        masked = podcast_intelligence.mask_intro_outro(
            blended,
            intro_end    = pi_result['intro_end'],
            outro_start  = pi_result['outro_start'],
            intro_factor = 0.0,
            outro_factor = 0.0,
        )
        golden = multi_modal_scorer.detect_golden_moments(
            semantic_scores, audio_features, video_features, top_k=20
        )
        for idx in pi_result['golden_segments']:
            if idx < len(masked):
                masked[idx] = min(1.0, masked[idx] * 1.20)
        for v_idx, v_score in pi_result['viral_moments'][:10]:
            if v_idx < len(masked):
                masked[v_idx] = min(1.0, masked[v_idx] + 0.10 * v_score)

        stats = multi_modal_scorer.analyze_score_distribution(masked)
        return masked, {'golden_moments': golden, 'score_stats': stats}

    # ══════════════════════════════════════════════════════════════════════════
    # STEP 7 – CONTENT-DRIVEN CLIP COUNT
    # ══════════════════════════════════════════════════════════════════════════

    def _decide_clips_dynamic(
        self,
        conversations:    List[Tuple[int, int]],
        segments:         List,
        scores:           List[float],
        conv_metrics:     List[Dict],
        target_seconds:   int,
    ) -> List[Tuple[Tuple[int, int], float, float, str]]:
        """
        v5.1: Fully dynamic clip selection.
        Returns ALL valid candidates sorted by score so the
        budget-fill loop can pull replacements if needed.
        """
        MIN_CLIP_SECS = settings.HIGHLIGHT_MIN_CLIP_SECS
        MAX_SINGLE    = settings.HIGHLIGHT_MAX_SINGLE_CLIP_RATIO
        SIGMA         = settings.HIGHLIGHT_QUALITY_THRESHOLD_SIGMA
        ABSOLUTE_MAX  = 12

        # Build ALL valid candidates (no quality threshold yet)
        candidates = []
        for i, ((s, e), m) in enumerate(zip(conversations, conv_metrics)):
            if m['avg'] < 1e-4:
                continue
            dur = sum(float(segments[k].end) - float(segments[k].start)
                      for k in range(s, e))
            if dur < MIN_CLIP_SECS:
                continue

            boosted = m['avg'] * m['boost']
            candidates.append(((s, e), boosted, dur, m['dominant_type']))

        # Sort by boosted score
        candidates.sort(key=lambda x: x[1], reverse=True)

        if not candidates:
            print("[Phase2]   📊 No valid conversations — fallback to top-1")
            if conversations:
                s, e = conversations[0]
                dur = sum(float(segments[k].end) - float(segments[k].start)
                          for k in range(s, e))
                return [((s, e), 0.1, dur, 'unknown')]
            return []

        # Compute quality threshold for initial selection
        all_scores = [c[1] for c in candidates]
        mean_score = float(np.mean(all_scores))
        std_score  = float(np.std(all_scores))
        threshold  = mean_score + SIGMA * std_score

        # Greedy budget packing (initial selection)
        max_single_dur = target_seconds * MAX_SINGLE
        budget_left    = float(target_seconds) * 1.15
        selected       = []

        for (conv, sc, dur, dtype) in candidates:
            if len(selected) >= ABSOLUTE_MAX:
                break

            alloc = min(dur, max_single_dur)
            if alloc < MIN_CLIP_SECS:
                continue

            # Quality gate: first clip always passes, rest need threshold
            if selected and sc < threshold:
                continue

            if alloc > budget_left and selected:
                continue

            budget_left -= alloc
            selected.append((conv, sc, dur, dtype))

            if budget_left < MIN_CLIP_SECS:
                break

        if not selected and candidates:
            selected = [candidates[0]]

        utilisation = (1.0 - budget_left / (target_seconds * 1.15)) * 100
        n_above = sum(1 for c in candidates if c[1] >= threshold)

        print(
            f"[Phase2]   📊 Dynamic clip selection v5.1:\n"
            f"           Total candidates   : {len(candidates)}\n"
            f"           Quality threshold  : {threshold:.3f} "
            f"(mean={mean_score:.3f} + {SIGMA}×std={std_score:.3f})\n"
            f"           Above threshold    : {n_above}\n"
            f"           Budget             : {target_seconds}s\n"
            f"           ✅ Initial selected : {len(selected)} clips "
            f"({utilisation:.0f}% budget used)"
        )

        # Return ALL candidates — selected first, then rest for replacement pool
        selected_convs = {item[0] for item in selected}
        remaining = [c for c in candidates if c[0] not in selected_convs]
        return selected + remaining

    # ══════════════════════════════════════════════════════════════════════════
    # STEP 8 – DIVERSITY-AWARE CLIP SELECTION
    # ══════════════════════════════════════════════════════════════════════════

    def _select_conversations(
        self,
        conversations: List[Tuple[int, int]],
        segments:      List,
        scores:        List[float],
        content_types: List[Dict],
        num_clips:     int,
    ) -> List[Tuple[int, int]]:
        return podcast_intelligence.topic_diversity_rerank(
            conversations, segments, scores, content_types,
            num_clips    = num_clips,
            min_gap_segs = 10,
        )

    # ══════════════════════════════════════════════════════════════════════════
    # STEP 9 – CLIP EXTRACTION  (precise encode + audio fade)
    # ══════════════════════════════════════════════════════════════════════════

    def _extract_clip_precise(
        self,
        video_path:    str,
        start:         float,
        end:           float,
        output_path:   str,
        fade_duration: float = 0.3,
    ) -> str:
        duration       = end - start
        fade_out_start = max(0, duration - fade_duration)
        
        # Audio filters: Reset PTS to 0, then apply fades
        af = (
            f"asetpts=PTS-STARTPTS,"
            f"afade=t=in:st=0:d={fade_duration},"
            f"afade=t=out:st={fade_out_start:.3f}:d={fade_duration}"
        )
        
        # Video filters: Reset PTS to 0
        vf = "setpts=PTS-STARTPTS"

        duration_secs = end - start

        for vcodec, preset in [("h264_nvenc", "p4"), ("libx264", "ultrafast")]:
            cmd = [
                FFMPEG, "-y",
                "-ss", f"{start:.3f}",    # input-side seek (fast)
                "-i",  video_path,
                # Use -t (duration) NOT -to (absolute end).
                # With input-side -ss, -to means "stop at this timestamp in the
                # source file" and leaves container metadata on the original
                # timeline — browser shows wrong total duration + wrong scrub pos.
                # -t always means "output duration" regardless of seek mode.
                "-t",  f"{duration_secs:.3f}",
                "-vf",  vf,
                "-c:v", vcodec,
                "-preset", preset,
                "-b:v", "800k",
                "-maxrate", "1200k",
                "-bufsize",  "1600k",
                "-c:a", "aac", "-b:a", "128k",
                "-af",  af,
                # reset_timestamps rewrites container DTS/PTS to start at 0,
                # fixing progress bar and scrubbing position in browsers.
                "-reset_timestamps", "1",
                "-avoid_negative_ts", "make_zero",
                "-movflags", "+faststart",
                output_path,
            ]
            result = subprocess.run(
                cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
            )
            if result.returncode == 0:
                break
        else:
            raise RuntimeError(
                f"[ffmpeg extract] failed:\n{result.stderr[-500:]}"
            )

        size_mb = os.path.getsize(output_path) / 1024 / 1024
        print(f"    ✅ {os.path.basename(output_path)} ({duration:.1f}s → {size_mb:.1f}MB)")
        return output_path

    # ══════════════════════════════════════════════════════════════════════════
    # MAIN ENTRY POINT
    # ══════════════════════════════════════════════════════════════════════════

    def create_highlights(
        self,
        video_path:          str,
        audio_path:          str,
        segments:            List,
        duration_str:        str,
        suggestion:          Optional[str] = None,
        num_clips:           Optional[int] = None,
        demo_mode:           bool          = False,
        analysis_video_path: Optional[str] = None,
    ) -> Dict:
        """
        Runs the full highlight pipeline and returns individual clip info.
        Each clip is uploaded to Cloudinary separately.
        NO merging — that is handled by FusionService.

        Returns:
        {
            "clips": [
                {
                    "start_time": float,
                    "end_time":   float,
                    "duration":   float,
                    "url":        str,    ← individual Cloudinary URL
                    "clip_index": int,    ← 1-based
                },
                ...
            ],
            "clip_count":     int,
            "total_duration": float,
            "analysis":       dict,
        }
        """
        t_overall = time.time()
        timings   = {}
        analysis_video = analysis_video_path or video_path

        print("\n" + "=" * 70)
        print("[Phase2] 🏆 HIGHLIGHT GENERATION  v4  (clip-only)")
        print(f"[Phase2] Demo mode     : {'ON' if demo_mode else 'OFF'}")
        print(f"[Phase2] Analysis video: {analysis_video}")
        print(f"[Phase2] Output video  : {video_path}")
        print("=" * 70 + "\n")

        target_seconds = self.parse_duration(duration_str)
        print(f"[Phase2] Target: {target_seconds}s")

        # ── ① Sentence map ─────────────────────────────────────────────────────
        print("\n[Phase2] ① Building sentence boundary map…")
        t0 = time.time()
        sentence_map = self._build_sentence_map(segments)
        timings['sentence_map'] = time.time() - t0
        print(f"[Phase2]   ✅ {len(sentence_map)} sentences ({timings['sentence_map']:.2f}s)")

        # ── ② Conversation boundaries ─────────────────────────────────────────
        print("\n[Phase2] ② Detecting conversation boundaries…")
        t0 = time.time()
        conversations = self._detect_conversation_boundaries(segments)
        timings['boundaries'] = time.time() - t0
        print(f"[Phase2]   ✅ {len(conversations)} conversations ({timings['boundaries']:.2f}s)")

        # ── ③ Transcript analysis ─────────────────────────────────────────────
        print("\n[Phase2] ③ Transcript analysis (GPU embeddings)…")
        t0 = time.time()
        semantic_scores, suggestion_scores = self._compute_transcript_features(
            segments, suggestion
        )
        timings['transcript'] = time.time() - t0
        print(f"[Phase2]   ✅ Transcript done ({timings['transcript']:.2f}s)")

        # ── ④ Audio + Video (parallel) ────────────────────────────────────────
        print("\n[Phase2] ④ Audio + Video analysis (PARALLEL)…")
        t0 = time.time()
        audio_features, video_features, scene_times = \
            self._compute_audio_video_parallel(
                audio_path, analysis_video, segments, demo_mode
            )
        timings['av_parallel'] = time.time() - t0
        print(f"[Phase2]   ✅ A/V done ({timings['av_parallel']:.2f}s) "
              f"| {len(scene_times)} scenes")

        # ── ⑤ Podcast Intelligence ────────────────────────────────────────────
        print("\n[Phase2] ⑤ Podcast Intelligence analysis…")
        t0 = time.time()
        pi_result = self._run_podcast_intelligence(segments)
        timings['podcast_intelligence'] = time.time() - t0
        print(f"[Phase2]   ✅ PI done ({timings['podcast_intelligence']:.2f}s)")

        # ── ⑥ Multi-modal fusion ──────────────────────────────────────────────
        print("\n[Phase2] ⑥ Multi-modal fusion…")
        t0 = time.time()
        final_scores, analysis_data = self._fuse_and_score(
            segments, semantic_scores, suggestion_scores,
            audio_features, video_features, pi_result,
        )
        timings['fusion'] = time.time() - t0
        stats = analysis_data['score_stats']
        print(f"[Phase2]   ✅ Fusion done ({timings['fusion']:.2f}s) "
              f"| mean={stats['mean']:.3f} max={stats['max']:.3f}")

        # ── ⑦ Dynamic clip selection (v5) ──────────────────────────────────────
        print("\n[Phase2] ⑦ Dynamic clip selection (v5)…")
        t0 = time.time()

        # Conversation-level scoring
        conv_metrics = multi_modal_scorer.score_conversations(
            conversations, segments, final_scores,
            audio_features,
            pi_result.get('content_types', []),
        )

        # Dynamic selection — returns qualified candidates with scores
        dynamic_pool = self._decide_clips_dynamic(
            conversations, segments, final_scores,
            conv_metrics, target_seconds,
        )

        if not dynamic_pool:
            raise RuntimeError("No suitable conversations found.")

        timings['dynamic_selection'] = time.time() - t0

        # ── ⑧ Diversity-aware reranking ───────────────────────────────────────
        print("\n[Phase2] ⑧ Diversity-aware reranking…")
        t0 = time.time()

        # Separate initial selection from replacement pool
        # _decide_clips_dynamic returns: [selected...] + [rest...]
        # Count initial selected = those that fit within budget
        budget_check = float(target_seconds) * 1.15
        initial_count = 0
        for item in dynamic_pool:
            alloc = min(item[2], target_seconds * settings.HIGHLIGHT_MAX_SINGLE_CLIP_RATIO)
            budget_check -= alloc
            initial_count += 1
            if budget_check < settings.HIGHLIGHT_MIN_CLIP_SECS:
                break

        initial_pool = dynamic_pool[:max(initial_count, 1)]
        pool_convs = [item[0] for item in initial_pool]

        selected = self._select_conversations(
            pool_convs, segments, final_scores,
            pi_result['content_types'], len(pool_convs),
        )
        timings['selection'] = time.time() - t0
        if not selected:
            selected = pool_convs
        print(f"[Phase2]   ✅ {len(selected)} clips after diversity rerank "
              f"({timings['selection']:.2f}s)")

        # Build metadata lookup from FULL dynamic pool
        pool_lookup = {item[0]: item for item in dynamic_pool}

        # ── ⑨ Build windows + transcript text (PRE-EXTRACTION) ────────────────
        print("\n[Phase2] ⑨ Building clip windows + transcript previews…")
        clip_candidates: List[Dict] = []
        max_single_dur = target_seconds * settings.HIGHLIGHT_MAX_SINGLE_CLIP_RATIO

        # Also build a full candidate pool for replacements later
        all_conv_pool = []
        for item in dynamic_pool:
            conv_range = item[0]
            s_idx, e_idx = conv_range
            dur = sum(float(segments[k].end) - float(segments[k].start)
                      for k in range(s_idx, e_idx))
            all_conv_pool.append({
                'conv': conv_range,
                'score': item[1],
                'dur': dur,
                'type': item[3],
            })

        # Sort entire pool by score for replacement picking
        all_conv_pool.sort(key=lambda x: x['score'], reverse=True)

        used_ranges = set()  # track which conv ranges are already selected

        for idx, (s_idx, e_idx) in enumerate(selected):
            conv_dur = sum(float(segments[k].end) - float(segments[k].start)
                          for k in range(s_idx, e_idx))
            alloc_dur = min(conv_dur, max_single_dur)

            t_start, t_end = sentence_boundary_service.find_complete_window(
                segments, final_scores, sentence_map,
                s_idx, e_idx, alloc_dur,
                qa_pairs         = pi_result['qa_pairs'],
                exit_search_secs = 45.0,
            )

            # Cap overshoot
            if (t_end - t_start) > alloc_dur * 1.5:
                t_end = t_start + alloc_dur * 1.5

            # Validate completeness
            is_valid, issues = sentence_boundary_service.validate_clip_completeness(
                t_start, t_end, segments, pi_result['qa_pairs']
            )

            # Overlap prevention
            overlaps = False
            for c in clip_candidates:
                if t_start < c['t_end'] and t_end > c['t_start']:
                    overlaps = True
                    break
            if overlaps:
                print(f"[Phase2]   Candidate {idx}: SKIPPED (overlaps)")
                continue

            # Build FULL transcript text for this clip window
            clip_segs = [
                seg for seg in segments
                if float(seg.start) >= t_start - 0.5 and float(seg.end) <= t_end + 0.5
            ]
            full_transcript = ' '.join(seg.text.strip() for seg in clip_segs)
            preview_text    = full_transcript[:200]

            pool_item = pool_lookup.get((s_idx, e_idx))
            q_score   = pool_item[1] if pool_item else 0.0
            conv_type = pool_item[3] if pool_item else 'unknown'

            status = "✅" if is_valid else f"⚠️  {', '.join(issues)}"

            clip_candidates.append({
                'candidate_idx':      idx,
                'conv_range':         (s_idx, e_idx),
                't_start':            t_start,
                't_end':              t_end,
                'duration_secs':      t_end - t_start,
                'transcript':         full_transcript,
                'transcript_preview': preview_text,
                'quality_score':      round(q_score, 3),
                'conv_type':          conv_type,
                'is_valid':           is_valid,
                'issues':             issues,
            })
            used_ranges.add((s_idx, e_idx))

            print(
                f"[Phase2]   Candidate {idx}: {t_start:.1f}s → {t_end:.1f}s "
                f"({t_end - t_start:.1f}s) [{conv_type}] {status}"
            )

        # ── ⑨½ LLM Quality Gate — PRE-EXTRACTION ─────────────────────────────
        print("\n[Phase2] ⑨½ LLM Quality Gate (Groq — pre-extraction)…")
        t0_gate = time.time()

        validated = clip_quality_gate.validate_candidates(
            clip_candidates, float(target_seconds)
        )
        approved, rejected = clip_quality_gate.select_approved(
            validated, float(target_seconds), min_budget_pct=0.75
        )

        # ── Budget-fill: if still under 75%, grab more from full pool ─────────
        approved_dur = sum(c['duration_secs'] for c in approved)
        fill_pct     = approved_dur / target_seconds if target_seconds else 1.0

        if fill_pct < 0.75:
            print(
                f"\n[Phase2] ♻️  Budget fill: {fill_pct*100:.0f}% — "
                f"searching for replacement clips from {len(all_conv_pool)} conversations…"
            )
            approved_ranges = {c['conv_range'] for c in approved}
            for pool_entry in all_conv_pool:
                conv = pool_entry['conv']
                if conv in approved_ranges or conv in used_ranges:
                    continue

                s_idx, e_idx = conv
                conv_dur = pool_entry['dur']
                alloc_dur = min(conv_dur, max_single_dur)

                if alloc_dur < settings.HIGHLIGHT_MIN_CLIP_SECS:
                    continue

                # Build window for replacement candidate
                t_start, t_end = sentence_boundary_service.find_complete_window(
                    segments, final_scores, sentence_map,
                    s_idx, e_idx, alloc_dur,
                    qa_pairs         = pi_result['qa_pairs'],
                    exit_search_secs = 45.0,
                )
                if (t_end - t_start) > alloc_dur * 1.5:
                    t_end = t_start + alloc_dur * 1.5

                # Overlap check against existing approved clips
                overlaps = False
                for c in approved:
                    if t_start < c['t_end'] and t_end > c['t_start']:
                        overlaps = True
                        break
                if overlaps:
                    continue

                # Build transcript
                clip_segs = [
                    seg for seg in segments
                    if float(seg.start) >= t_start - 0.5 and float(seg.end) <= t_end + 0.5
                ]
                full_transcript = ' '.join(seg.text.strip() for seg in clip_segs)

                new_cand = {
                    'candidate_idx':      len(clip_candidates) + len(approved),
                    'conv_range':         conv,
                    't_start':            t_start,
                    't_end':              t_end,
                    'duration_secs':      t_end - t_start,
                    'transcript':         full_transcript,
                    'transcript_preview': full_transcript[:200],
                    'quality_score':      round(pool_entry['score'], 3),
                    'conv_type':          pool_entry['type'],
                    'is_valid':           True,
                    'issues':             [],
                    'llm_completeness':   6,
                    'llm_quality':        6,
                    'llm_approved':       True,
                    '_replacement':       True,
                }

                approved.append(new_cand)
                approved_ranges.add(conv)
                approved_dur += new_cand['duration_secs']
                fill_pct = approved_dur / target_seconds

                print(
                    f"    ♻️  Added replacement: {t_start:.1f}s → {t_end:.1f}s "
                    f"({t_end - t_start:.1f}s) [{pool_entry['type']}] "
                    f"score={pool_entry['score']:.3f}"
                )

                if fill_pct >= 0.85:
                    break

            print(
                f"[Phase2] ♻️  After replacements: {len(approved)} clips, "
                f"{approved_dur:.0f}s ({fill_pct*100:.0f}% of {target_seconds}s)"
            )

        timings['llm_gate'] = time.time() - t0_gate

        # ── ⑩ Extract ONLY approved clips + upload ────────────────────────────
        print(f"\n[Phase2] ⑩ Extracting and uploading {len(approved)} approved clips…")
        os.makedirs("highlights", exist_ok=True)
        clip_info_list: List[Dict] = []
        t0 = time.time()

        for idx, cand in enumerate(approved, 1):
            t_start = cand['t_start']
            t_end   = cand['t_end']
            clip_path = f"highlights/clip_{idx}_{t_start:.1f}_{t_end:.1f}.mp4"

            clip_url  = None

            try:
                self._extract_clip_precise(video_path, t_start, t_end, clip_path)

                print(f"    ☁️  Uploading clip {idx} to Cloudinary…")
                clip_url = upload_to_cloudinary(clip_path)
                print(f"    ✅ Clip {idx} URL: {clip_url}")

                clip_info_list.append({
                    "start_time":         t_start,
                    "end_time":           t_end,
                    "duration":           t_end - t_start,
                    "url":                clip_url,
                    "clip_index":         idx,
                    "transcript_preview": cand['transcript_preview'],
                    "quality_score":      cand['quality_score'],
                    "conversation_type":  cand['conv_type'],
                })

            except Exception as e:
                print(f"    ❌ Clip {idx} failed: {str(e)[:120]} — skipping")
                continue
            finally:
                # Only delete local clip if it was uploaded to Cloudinary
                # Keep it if URL is a local fallback (contains /static/)
                if clip_url and "/static/" not in clip_url:
                    try:
                        os.remove(clip_path)
                    except Exception:
                        pass

        timings['extraction_upload'] = time.time() - t0
        print(f"[Phase2]   ✅ {len(clip_info_list)} clips extracted & uploaded "
              f"({timings['extraction_upload']:.2f}s)")

        total_time     = time.time() - t_overall
        total_duration = sum(c["duration"] for c in clip_info_list)
        budget_util    = (total_duration / target_seconds * 100) if target_seconds else 0

        print("\n" + "=" * 70)
        print("[Phase2] ✅ HIGHLIGHT GENERATION COMPLETE  v5.1")
        print(f"  Clips          : {len(clip_info_list)}")
        print(f"  Total duration : {total_duration:.1f}s")
        print(f"  Budget used    : {budget_util:.0f}% of {target_seconds}s")
        print(f"  TOTAL TIME     : {total_time:.1f}s ({total_time/60:.1f} min)")
        print("=" * 70 + "\n")

        return {
            "clips":          clip_info_list,
            "clip_count":     len(clip_info_list),
            "total_duration": total_duration,
            "analysis": {
                "score_stats":   stats,
                "scene_changes": len(scene_times),
                "podcast_intel": pi_result['stats'],
                "timings":       timings,
            },
        }


# ── Singleton ─────────────────────────────────────────────────────────────────
highlight_generator = HighlightGenerationService()