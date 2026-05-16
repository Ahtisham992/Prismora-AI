import librosa
import numpy as np
import math
from typing import List
from pathlib import Path

def compute_rms_per_segment(audio_path: str, segments: List, sr: int = 16000) -> List[float]:
    """
    Compute normalized RMS (energy) per segment from the audio file.
    """

    p = Path(audio_path)
    if not p.exists():
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    y, orig_sr = librosa.load(str(p), sr=sr, mono=True)
    rms_per_segment = []

    for s in segments:
        start = float(s.start)
        end = float(s.end)

        s_frame = int(max(0, math.floor(start * sr)))
        e_frame = int(min(len(y), math.ceil(end * sr)))

        if e_frame <= s_frame:
            rms = 0.0
        else:
            block = y[s_frame:e_frame]
            rms = float(np.sqrt(np.mean(block**2) + 1e-12))

        rms_per_segment.append(rms)

    # Normalize to 0–1
    arr = np.array(rms_per_segment, dtype=float)

    if arr.size == 0:
        return []

    mn, mx = arr.min(), arr.max()

    if mx - mn < 1e-8:
        # constant audio → return middle strength
        return [0.5 for _ in rms_per_segment]

    norm = ((arr - mn) / (mx - mn)).astype(float)

    # ⭐ CRITICAL FIX: return FLAT float list, no nested lists
    return [float(v) for v in norm.tolist()]

