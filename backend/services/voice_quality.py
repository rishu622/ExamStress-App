"""Voice-quality (vocal stress / distress) model.

Crying, emotional strain and a shaky or "choked" voice change *how* the voice is produced,
not just how fast or loud someone speaks. This module measures those changes frame by frame:

* jitter      cycle-to-cycle pitch instability (shaky / trembling voice)
* shimmer     frame-to-frame loudness instability
* HNR         harmonics-to-noise ratio; low = breathy, tearful or strained voice
* breaks      the voice dropping out of a steady tone mid-phrase (voice cracking, sobbing breaths)
* sobs        rhythmic loudness bursts typical of crying
* range       pitch excursions / sudden pitch jumps (voice breaking upwards)

The measures are combined into a 0-1 vocal strain index. Like everything in ExamStress
it is a screening signal for a human to look at, not a diagnosis.
"""
from typing import Any

import numpy as np

MIN_F0, MAX_F0 = 70, 700  # crying and distressed speech often goes well above 400 Hz


def frame_periodicity(frame: np.ndarray, rate: int) -> tuple[float | None, float]:
    """Returns (pitch_hz or None, autocorrelation peak 0-1) using an FFT autocorrelation."""
    frame = frame - frame.mean()
    energy = float(np.dot(frame, frame))
    if energy <= 1e-8:
        return None, 0.0
    n = len(frame)
    spec = np.fft.rfft(frame * np.hanning(n), 2 * n)
    corr = np.fft.irfft(np.abs(spec) ** 2)[:n]
    # Normalise by the window's own autocorrelation so periodic signals reach ~1.
    window_corr = np.fft.irfft(np.abs(np.fft.rfft(np.hanning(n), 2 * n)) ** 2)[:n]
    corr = corr / (corr[0] + 1e-12) / (window_corr / window_corr[0] + 1e-6)
    min_lag, max_lag = int(rate / MAX_F0), min(int(rate / MIN_F0), n - 2)
    if max_lag <= min_lag:
        return None, 0.0
    segment = corr[min_lag:max_lag]
    lag = int(np.argmax(segment)) + min_lag
    peak = float(min(0.999, corr[lag]))
    # Prefer the shortest lag with a near-maximal peak, avoiding octave-low errors.
    for divisor in (3, 2):
        short = lag // divisor
        if short >= min_lag and corr[short] > 0.85 * corr[lag]:
            lag, peak = short, float(min(0.999, corr[short]))
            break
    if peak < 0.45:
        return None, max(0.0, peak)
    # Parabolic interpolation for sub-sample lag precision (needed for jitter).
    if 0 < lag < n - 1:
        a, b, c = corr[lag - 1], corr[lag], corr[lag + 1]
        denom = a - 2 * b + c
        offset = 0.5 * (a - c) / denom if abs(denom) > 1e-12 else 0.0
        lag_f = lag + max(-0.5, min(0.5, offset))
    else:
        lag_f = float(lag)
    return rate / lag_f, peak


def _runs(mask: np.ndarray) -> list[tuple[int, int]]:
    runs, start = [], None
    for i, v in enumerate(mask):
        if v and start is None:
            start = i
        elif not v and start is not None:
            runs.append((start, i))
            start = None
    if start is not None:
        runs.append((start, len(mask)))
    return runs


def analyse(frames: np.ndarray, rms: np.ndarray, voiced: np.ndarray, rate: int, hop_s: float) -> dict[str, Any]:
    idx = np.flatnonzero(voiced)
    pitch = np.full(len(frames), np.nan)
    peaks = np.zeros(len(frames))
    for i in idx:
        p, r = frame_periodicity(frames[i], rate)
        peaks[i] = r
        if p is not None:
            pitch[i] = p
    periodic = ~np.isnan(pitch)

    # Jitter / shimmer: deviation of each frame from the average of its neighbours, so smooth
    # intonation (normal speech melody) is ignored and only rough, shaky variation counts.
    jit, shim = [], []
    for i in range(1, len(frames) - 1):
        if periodic[i - 1] and periodic[i] and periodic[i + 1]:
            semis = 12 * np.log2(pitch[i - 1:i + 2])
            jump = abs(semis[1] - (semis[0] + semis[2]) / 2)
            if jump < 3:  # larger jumps are pitch breaks, counted separately
                jit.append(jump)
            db = 20 * np.log10(rms[i - 1:i + 2])
            shim.append(abs(db[1] - (db[0] + db[2]) / 2))
    jitter = float(np.mean(jit)) if len(jit) >= 5 else None
    shimmer = float(np.mean(shim)) if len(shim) >= 5 else None

    voiced_peaks = peaks[voiced]
    hnr_frames = 10 * np.log10(np.clip(voiced_peaks, 1e-3, 0.999) / (1 - np.clip(voiced_peaks, 1e-3, 0.999)))
    hnr = float(np.median(hnr_frames)) if len(hnr_frames) >= 5 else None

    # Voice breaks: inside the speaking span, sound is present but stops being a steady tone.
    breaks = 0
    if len(idx):
        span = slice(idx[0], idx[-1] + 1)
        aperiodic_voiced = voiced[span] & ~periodic[span]
        breaks = sum(1 for a, b in _runs(aperiodic_voiced) if b - a >= 8)
    p_valid = pitch[periodic]
    pitch_jumps = 0
    for i in range(1, len(frames)):
        if periodic[i] and periodic[i - 1]:
            jump = abs(12 * np.log2(pitch[i] / pitch[i - 1]))
            # 4-10 semitones in 10 ms = the voice cracking; exactly ~12 is usually a tracking octave error.
            if 4 < jump < 10:
                pitch_jumps += 1
    pitch_range = float(np.percentile(12 * np.log2(p_valid), 95) - np.percentile(12 * np.log2(p_valid), 5)) if len(p_valid) >= 5 else None
    pitch_max = float(np.percentile(p_valid, 95)) if len(p_valid) >= 5 else None

    # Sob-like bursts: short separate loud bursts with gaps, many per second.
    bursts = _runs(voiced)
    short_bursts = [
        r for k, r in enumerate(bursts)
        if (r[1] - r[0]) * hop_s < 0.35 and k > 0 and (r[0] - bursts[k - 1][1]) * hop_s >= 0.12
    ]
    duration = len(frames) * hop_s
    sob_rate = len(short_bursts) / duration if duration else 0.0

    seconds = max(duration, 0.5)
    return {
        'jitter_st': round(jitter, 3) if jitter is not None else None,
        'shimmer_db': round(shimmer, 2) if shimmer is not None else None,
        'hnr_db': round(hnr, 1) if hnr is not None else None,
        'voice_breaks': breaks,
        'voice_breaks_per_s': round(breaks / seconds, 2),
        'pitch_jumps': pitch_jumps,
        'pitch_range_st': round(pitch_range, 1) if pitch_range is not None else None,
        'pitch_max_hz': round(pitch_max) if pitch_max is not None else None,
        'sob_bursts_per_s': round(sob_rate, 2),
        'periodic_ratio': round(float(periodic[voiced].mean()), 2) if voiced.any() else 0.0,
    }


def _ramp(value: float | None, low: float, high: float) -> float:
    """0 at `low`, 1 at `high` (either direction)."""
    if value is None or high == low:
        return 0.0
    return float(min(1.0, max(0.0, (value - low) / (high - low))))


def strain(q: dict[str, Any], base_pitch_hz: float | None) -> dict[str, Any]:
    """Combines voice-quality measures into a 0-1 vocal strain index with named contributors."""
    parts = {
        # Calibrated so calm real speech (incl. fast speech) stays below ~0.15 and synthetic crying lands above 0.5.
        'Breathy or tearful tone': 0.35 * _ramp(q.get('hnr_db'), 3.5, 0.5),
        'Strained high pitch': 0.18 * max(_ramp(q.get('pitch_max_hz'), 420, 650), _ramp(base_pitch_hz, 330, 450)),
        'Shaky, trembling voice': 0.15 * _ramp(q.get('jitter_st'), 0.35, 0.9),
        'Voice breaking / cracking': 0.15 * max(_ramp(q.get('voice_breaks_per_s'), 0.6, 1.8), _ramp(q.get('pitch_jumps'), 3, 8)),
        'Sob-like bursts': 0.12 * _ramp(q.get('sob_bursts_per_s'), 1.3, 2.2),
        'Unsteady loudness': 0.05 * _ramp(q.get('shimmer_db'), 1.0, 2.5),
    }
    index = float(min(1.0, sum(parts.values())))
    contributors = sorted(((k, v) for k, v in parts.items() if v >= 0.03), key=lambda kv: -kv[1])
    other_cues = sum(1 for k in ('Strained high pitch', 'Shaky, trembling voice', 'Voice breaking / cracking', 'Sob-like bursts') if parts[k] >= 0.03)
    if index >= 0.45 and parts['Breathy or tearful tone'] >= 0.2 and other_cues >= 2:
        label = 'Possible crying / acute distress'
    elif index >= 0.35:
        label = 'Strained, emotional voice'
    elif index >= 0.18:
        label = 'Some vocal tension'
    else:
        label = 'Steady, relaxed voice'
    return {
        'index': round(index, 2),
        'label': label,
        'possible_crying': label.startswith('Possible crying'),
        'contributors': [{'label': k, 'weight': round(v, 3)} for k, v in contributors],
    }
