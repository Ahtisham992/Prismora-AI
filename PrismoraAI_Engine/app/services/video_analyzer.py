# app/services/video_analyzer.py
"""
OPTIMIZED VIDEO ANALYZER  v3
Fixes vs previous version:
  - Scene sampling interval: every 5 s → every 10 s (halves scene-sample frames)
  - n_samples per segment capped at 4 (was up to 8 for long segments)
  - VideoCapture opened ONCE, reused across all segments
  - Face detection only on segments > 3 s (skip for micro-segments)
  - Resize target: 240×135 (was 320×180) for motion/complexity
  - Face detection target: 120×68 (was 160×90)
  - GPU-accelerated normalization via PyTorch
"""

import cv2
import numpy as np
import torch
from typing import List, Dict, Tuple
import warnings
warnings.filterwarnings('ignore')

# Fixed keyframes per segment – don't scale with duration, just use 4
_N_SAMPLES = 4
# Scene detection global sampling interval (seconds)
_SCENE_INTERVAL = 10.0
# Analysis resolution (width, height) – small enough to be fast
_ANALYSIS_RES  = (240, 135)
_FACE_RES      = (120, 68)


class VideoAnalyzer:
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )
        print("[VideoAnalyzer] 🎥 Initialized (transcript-guided keyframe sampling)")
        print( "[VideoAnalyzer]    PySceneDetect: DISABLED")
        print(f"[VideoAnalyzer]    Analysis res: {_ANALYSIS_RES}  Face res: {_FACE_RES}")
        print(f"[VideoAnalyzer]    Normalization device: {self.device}")

    # ------------------------------------------------------------------
    # SCENE DETECTION from globally sampled frames (cheap)
    # ------------------------------------------------------------------
    def _detect_scenes_from_samples(
        self,
        frames: List[np.ndarray],
        times:  List[float],
        threshold: float = 35.0
    ) -> List[float]:
        scene_times = []
        prev_hist   = None
        for frame, t in zip(frames, times):
            gray = cv2.cvtColor(cv2.resize(frame, _ANALYSIS_RES), cv2.COLOR_BGR2GRAY)
            hist = cv2.calcHist([gray], [0], None, [32], [0, 256])
            cv2.normalize(hist, hist)
            hist = hist.flatten()
            if prev_hist is not None:
                diff = cv2.compareHist(prev_hist, hist, cv2.HISTCMP_CHISQR)
                if diff > threshold:
                    scene_times.append(t)
            prev_hist = hist
        return scene_times

    # ------------------------------------------------------------------
    # SAMPLE N KEYFRAMES for one segment (seek-based)
    # ------------------------------------------------------------------
    def _sample_frames(
        self,
        cap:      cv2.VideoCapture,
        start:    float,
        end:      float,
        n:        int = _N_SAMPLES
    ) -> Tuple[List[np.ndarray], List[float]]:
        dur    = max(end - start, 0.5)
        margin = min(0.3, dur * 0.1)
        times  = np.linspace(start + margin, end - margin, n)

        frames = []
        ts     = []
        for t in times:
            cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
            ret, fr = cap.read()
            if ret and fr is not None:
                frames.append(fr)
                ts.append(float(t))
        return frames, ts

    # ------------------------------------------------------------------
    # FEATURES from a list of sampled frames
    # ------------------------------------------------------------------
    def _features_from_frames(
        self,
        frames:      List[np.ndarray],
        scene_times: List[float],
        seg_start:   float,
        seg_end:     float,
        do_faces:    bool = True
    ) -> Dict[str, float]:
        if not frames:
            return self._zero_features()

        motion_scores = []
        face_counts   = []
        complexity    = []
        brightness    = []
        prev_gray     = None

        for frame in frames:
            small = cv2.resize(frame, _ANALYSIS_RES)
            gray  = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)

            # Motion
            if prev_gray is not None:
                diff = cv2.absdiff(prev_gray, gray)
                motion_scores.append(float(np.mean(diff)))
            prev_gray = gray

            # Face detection (optional, on tiny thumbnail)
            if do_faces:
                tiny  = cv2.resize(gray, _FACE_RES)
                faces = self.face_cascade.detectMultiScale(
                    tiny, scaleFactor=1.1, minNeighbors=3, minSize=(8, 8)
                )
                face_counts.append(len(faces))
            else:
                face_counts.append(0)

            # Visual complexity (edge density)
            edges = cv2.Canny(gray, 50, 150)
            complexity.append(float(np.mean(edges > 0)))

            brightness.append(float(np.mean(gray)))

        motion_mean = float(np.mean(motion_scores)) if motion_scores else 0.0
        motion_max  = float(np.max(motion_scores))  if motion_scores else 0.0
        motion_var  = float(np.var(motion_scores))  if motion_scores else 0.0

        face_presence  = float(np.mean([1 if f > 0 else 0 for f in face_counts]))
        face_count_avg = float(np.mean(face_counts))

        vis_complexity = float(np.mean(complexity))
        complex_var    = float(np.var(complexity))
        bright_mean    = float(np.mean(brightness))
        bright_var     = float(np.var(brightness))

        # Scene info
        n_scenes = float(sum(1 for t in scene_times if seg_start <= t <= seg_end))
        dists = ([abs(t - seg_start) for t in scene_times] +
                 [abs(t - seg_end)   for t in scene_times] + [999.0])
        scene_prox = float(1.0 / (1.0 + min(dists)))

        return {
            'motion_mean':        motion_mean,
            'motion_max':         motion_max,
            'motion_variance':    motion_var,
            'face_presence':      face_presence,
            'face_count_avg':     face_count_avg,
            'visual_complexity':  vis_complexity,
            'complexity_variance':complex_var,
            'brightness_mean':    bright_mean,
            'brightness_variance':bright_var,
            'frames_analyzed':    float(len(frames)),
            'scene_changes':      n_scenes,
            'scene_proximity':    scene_prox,
        }

    # ------------------------------------------------------------------
    # PUBLIC – analyze all segments (single VideoCapture pass)
    # ------------------------------------------------------------------
    def analyze_all_segments(
        self,
        video_path:  str,
        segments:    List,
        sample_rate: int = 5     # kept for API compat
    ) -> Tuple[List[Dict[str, float]], List[float]]:
        n = len(segments)
        print(f"[VideoAnalyzer] 🎥 Analyzing {n} segments (keyframe sampling)...")

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            print(f"[VideoAnalyzer] ⚠️  Cannot open: {video_path}")
            return [self._zero_features() for _ in segments], []

        fps_v     = cap.get(cv2.CAP_PROP_FPS) or 25.0
        total_dur = cap.get(cv2.CAP_PROP_FRAME_COUNT) / fps_v

        # ── Global scene sampling (every 10 s) ───────────────────────
        scene_sample_times = np.arange(0, total_dur, _SCENE_INTERVAL)
        g_frames, g_times  = [], []
        print(f"[VideoAnalyzer] 🎬 Scene sampling ({len(scene_sample_times)} pts)...")
        for t in scene_sample_times:
            cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
            ret, fr = cap.read()
            if ret and fr is not None:
                g_frames.append(fr)
                g_times.append(float(t))

        scene_times = self._detect_scenes_from_samples(g_frames, g_times)
        print(f"[VideoAnalyzer] ✅ {len(scene_times)} scene changes detected")

        # ── Per-segment keyframe analysis ────────────────────────────
        results = []
        for i, seg in enumerate(segments):
            start = float(seg.start)
            end   = float(seg.end)
            dur   = end - start

            # Skip face detection for very short segments (< 3 s) – speed
            do_faces = dur >= 3.0

            frames, _ = self._sample_frames(cap, start, end, n=_N_SAMPLES)
            feat = self._features_from_frames(
                frames, scene_times, start, end, do_faces=do_faces
            )
            results.append(feat)

            if (i + 1) % 300 == 0:
                print(f"[VideoAnalyzer]   → {i+1}/{n}")

        cap.release()
        print(f"[VideoAnalyzer] ✅ Video analysis complete ({n} segments)")
        return results, scene_times

    # ------------------------------------------------------------------
    # GPU NORMALIZATION
    # ------------------------------------------------------------------
    def normalize_features(self, features_list: List[Dict[str, float]]) -> List[Dict[str, float]]:
        if not features_list:
            return []

        skip  = {'frames_analyzed'}
        keys  = list(features_list[0].keys())
        nkeys = [k for k in keys if k not in skip]
        n     = len(features_list)

        mat = torch.tensor(
            [[f[k] for k in nkeys] for f in features_list],
            dtype=torch.float32, device=self.device
        ).T

        mins     = mat.min(dim=1, keepdim=True).values
        maxs     = mat.max(dim=1, keepdim=True).values
        rng      = maxs - mins
        safe_rng = rng.clone()
        safe_rng[rng < 1e-8] = 1.0
        normed   = (mat - mins) / safe_rng
        normed[rng.squeeze(1) < 1e-8] = 0.5
        normed   = normed.T.cpu().numpy()

        result = []
        for i in range(n):
            d = {k: float(normed[i, j]) for j, k in enumerate(nkeys)}
            for k in skip:
                d[k] = features_list[i].get(k, 0.0)
            result.append(d)
        return result

    # ------------------------------------------------------------------
    def _zero_features(self) -> Dict[str, float]:
        return {
            'motion_mean': 0.0,        'motion_max': 0.0,
            'motion_variance': 0.0,
            'face_presence': 0.0,      'face_count_avg': 0.0,
            'visual_complexity': 0.0,  'complexity_variance': 0.0,
            'brightness_mean': 128.0,  'brightness_variance': 0.0,
            'frames_analyzed': 0.0,
            'scene_changes': 0.0,      'scene_proximity': 0.0,
        }

    def detect_scenes(self, video_path: str, threshold: float = 27.0) -> List[float]:
        cap   = cv2.VideoCapture(video_path)
        fps_v = cap.get(cv2.CAP_PROP_FPS) or 25.0
        total = cap.get(cv2.CAP_PROP_FRAME_COUNT) / fps_v
        times = np.arange(0, total, _SCENE_INTERVAL)
        frs, ts = [], []
        for t in times:
            cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
            ret, fr = cap.read()
            if ret:
                frs.append(fr); ts.append(t)
        cap.release()
        return self._detect_scenes_from_samples(frs, ts, threshold)


# Singleton
video_analyzer = VideoAnalyzer()