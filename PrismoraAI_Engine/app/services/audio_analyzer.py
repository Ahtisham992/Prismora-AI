# app/services/audio_analyzer.py
"""
OPTIMIZED AUDIO ANALYZER  v3 – FAST
Root cause of 12-min stall: pyin() on the full 2-hour audio signal.
Fix:
  • Pre-compute only CHEAP global arrays (RMS, ZCR, spectral) – no pitch
  • Also cache a 8 kHz downsampled copy of the signal for pitch
  • Pitch: librosa.yin() called on a SHORT slice (per segment) at 8 kHz
  • yin() on a 5-second 8 kHz slice takes ~10 ms; pyin() on 2 hours = 10+ min
  • Normalization: single GPU torch tensor op

Expected total audio time: 60–90 s for a 2-hour podcast
"""

import librosa
import numpy as np
import torch
from typing import List, Dict
import warnings
warnings.filterwarnings('ignore')


class AudioAnalyzer:
    def __init__(self):
        self.sr      = 16000     # full SR for energy / spectral
        self.sr_low  = 8000      # 8 kHz used ONLY for yin pitch slices
        self.device  = "cuda" if torch.cuda.is_available() else "cpu"
        self._cache: Dict[str, dict] = {}

        if self.device == "cuda":
            print("[AudioAnalyzer] 🎵 GPU normalization enabled")
        print("[AudioAnalyzer] ✅ Initialized – per-segment yin pitch (no full-file pyin)")

    # ──────────────────────────────────────────────────────────────────
    # STEP 1: Load once, compute cheap global feature arrays
    #         NO pitch extraction here – that was the bottleneck
    # ──────────────────────────────────────────────────────────────────
    def _precompute(self, audio_file: str) -> dict:
        if audio_file in self._cache:
            return self._cache[audio_file]

        print(f"[AudioAnalyzer] 📂 Loading: {audio_file}")
        y, sr = librosa.load(audio_file, sr=self.sr, mono=True)
        print(f"[AudioAnalyzer] ✅ {len(y)/sr:.0f}s loaded – computing global feature arrays…")

        hop = 512

        # Cheap global ops – each is one vectorized numpy pass
        rms      = librosa.feature.rms(y=y, hop_length=hop)[0].astype(np.float32)
        zcr      = librosa.feature.zero_crossing_rate(y, hop_length=hop)[0].astype(np.float32)
        centroid = librosa.feature.spectral_centroid(y=y, sr=sr, hop_length=hop)[0].astype(np.float32)
        rolloff  = librosa.feature.spectral_rolloff(y=y, sr=sr, hop_length=hop)[0].astype(np.float32)

        # 8 kHz copy for fast per-segment yin pitch
        print("[AudioAnalyzer] 📉 Resampling to 8 kHz for pitch slices…")
        y_low = librosa.resample(y, orig_sr=sr, target_sr=self.sr_low)

        print("[AudioAnalyzer] ✅ Pre-computation done (RMS / ZCR / spectral / 8 kHz buffer)")

        pc = {
            'y':         y,
            'y_low':     y_low,
            'sr':        sr,
            'sr_low':    self.sr_low,
            'hop':       hop,
            'fps':       float(sr) / hop,
            'rms':       rms,
            'zcr':       zcr,
            'centroid':  centroid,
            'rolloff':   rolloff,
            'n_frames':  len(rms),
            'n_full':    len(y),
            'n_low':     len(y_low),
        }
        self._cache[audio_file] = pc
        return pc

    # ──────────────────────────────────────────────────────────────────
    # STEP 2: Fast yin pitch – called per segment on a SHORT slice
    # ──────────────────────────────────────────────────────────────────
    def _pitch_features(self, y_low_slice: np.ndarray, sr_low: int) -> Dict[str, float]:
        _zero = dict(pitch_variance=0.0, pitch_mean=0.0,
                     pitch_range=0.0, pitch_trend=0.0)
        if len(y_low_slice) < sr_low * 0.3:   # skip < 0.3 s
            return _zero
        try:
            f0 = librosa.yin(
                y_low_slice,
                fmin=75, fmax=600,
                sr=sr_low,
                hop_length=256,       # coarser hop → faster
                frame_length=1024,
            ).astype(np.float32)

            voiced = f0[(f0 > 75) & (f0 < 600)]
            if len(voiced) < 4:
                return _zero

            trend = (float(np.polyfit(np.arange(len(voiced)), voiced, 1)[0])
                     if len(voiced) > 8 else 0.0)
            return dict(
                pitch_variance = float(np.var(voiced)),
                pitch_mean     = float(np.mean(voiced)),
                pitch_range    = float(voiced.max() - voiced.min()),
                pitch_trend    = trend,
            )
        except Exception:
            return _zero

    # ──────────────────────────────────────────────────────────────────
    # STEP 3: Slice pre-computed arrays for one segment
    # ──────────────────────────────────────────────────────────────────
    def _analyze_segment(self, pc: dict, start: float, end: float) -> Dict[str, float]:
        fps = pc['fps']
        nf  = pc['n_frames']
        sr  = pc['sr']
        nfull = pc['n_full']

        f0 = int(np.clip(start * fps, 0, nf - 1))
        f1 = int(np.clip(end   * fps, 1, nf))
        if f1 <= f0:
            return self._zero_features()

        rms_s = pc['rms'][f0:f1]
        zcr_s = pc['zcr'][f0:f1]
        cen_s = pc['centroid'][f0:f1]
        rol_s = pc['rolloff'][f0:f1]

        # ── Energy ────────────────────────────────────────────────────
        e_mean  = float(np.mean(rms_s))
        e_var   = float(np.var(rms_s))
        e_max   = float(rms_s.max()) if len(rms_s) else 0.0
        thr     = float(np.percentile(rms_s, 75)) if len(rms_s) else 0.0
        e_peaks = float(np.mean(rms_s > thr)) if thr > 0 else 0.0

        # ── Speaking rate (ZCR) ───────────────────────────────────────
        sp_rate = float(np.mean(zcr_s))
        sp_var  = float(np.var(zcr_s))

        # ── Spectral ──────────────────────────────────────────────────
        brightness = float(np.mean(cen_s))
        bright_var = float(np.var(cen_s))
        richness   = float(np.mean(rol_s))

        # ── Pause ─────────────────────────────────────────────────────
        sil_thr = 0.2 * e_max if e_max > 0 else 0.01
        silent  = rms_s < sil_thr
        p_ratio = float(np.mean(silent))
        trans   = np.diff(silent.astype(np.int8))
        p_count = float(np.sum(trans == 1))

        # ── Pitch (yin on 8 kHz slice) ────────────────────────────────
        nlow = pc['n_low']
        sl   = pc['sr_low']
        l0   = int(np.clip(start * sl, 0, nlow - 1))
        l1   = int(np.clip(end   * sl, 1, nlow))
        pitch_f = self._pitch_features(pc['y_low'][l0:l1], sl)

        return {
            **pitch_f,
            'speaking_rate':       sp_rate,
            'speaking_rate_var':   sp_var,
            'energy_mean':         e_mean,
            'energy_variance':     e_var,
            'energy_max':          e_max,
            'energy_peaks':        e_peaks,
            'spectral_brightness': brightness,
            'brightness_variance': bright_var,
            'voice_richness':      richness,
            'pause_ratio':         p_ratio,
            'pause_count':         p_count,
        }

    # ──────────────────────────────────────────────────────────────────
    # PUBLIC API
    # ──────────────────────────────────────────────────────────────────
    def analyze_all_segments_parallel(
        self,
        audio_file:  str,
        segments:    List,
        max_workers: int = 4,   # kept for API compat; not used
    ) -> List[Dict[str, float]]:
        pc = self._precompute(audio_file)
        n  = len(segments)
        print(f"[AudioAnalyzer] 🎵 Slicing {n} segments…")

        results = []
        for i, seg in enumerate(segments):
            results.append(self._analyze_segment(pc, float(seg.start), float(seg.end)))
            if (i + 1) % 300 == 0:
                print(f"[AudioAnalyzer]   → {i+1}/{n}")

        print(f"[AudioAnalyzer] ✅ Complete ({n} segments)")
        return results

    def normalize_features(self, features_list: List[Dict[str, float]]) -> List[Dict[str, float]]:
        if not features_list:
            return []

        keys = list(features_list[0].keys())
        n    = len(features_list)

        mat = torch.tensor(
            [[f[k] for k in keys] for f in features_list],
            dtype=torch.float32, device=self.device,
        ).T   # (n_features, n_segments)

        mins  = mat.min(dim=1, keepdim=True).values
        maxs  = mat.max(dim=1, keepdim=True).values
        rng   = maxs - mins
        safe  = rng.clone(); safe[rng < 1e-8] = 1.0
        normed= (mat - mins) / safe
        normed[rng.squeeze(1) < 1e-8] = 0.5

        if 'pause_ratio' in keys:
            normed[keys.index('pause_ratio')] = 1.0 - normed[keys.index('pause_ratio')]

        normed = normed.T.cpu().numpy()
        return [{k: float(normed[i, j]) for j, k in enumerate(keys)} for i in range(n)]

    def _zero_features(self) -> Dict[str, float]:
        return {
            'pitch_variance': 0.0,   'pitch_mean': 0.0,
            'pitch_range': 0.0,      'pitch_trend': 0.0,
            'speaking_rate': 0.0,    'speaking_rate_var': 0.0,
            'energy_mean': 0.0,      'energy_variance': 0.0,
            'energy_max': 0.0,       'energy_peaks': 0.0,
            'spectral_brightness': 0.0, 'brightness_variance': 0.0,
            'voice_richness': 0.0,
            'pause_ratio': 1.0,      'pause_count': 0.0,
        }

    def detect_emphasis_moments(self, features_list, threshold=0.75):
        return [
            i for i, f in enumerate(features_list)
            if (0.4 * f.get('pitch_variance', 0) +
                0.3 * f.get('energy_peaks', 0) +
                0.3 * f.get('speaking_rate_var', 0)) >= threshold
        ]

    def analyze_segment(self, audio_file: str, start: float, end: float) -> Dict[str, float]:
        return self._analyze_segment(self._precompute(audio_file), start, end)


# Singleton
audio_analyzer = AudioAnalyzer()