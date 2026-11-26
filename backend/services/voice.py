"""Acoustic features from a short spoken check-in.

The browser converts every recording or upload to 16-bit PCM WAV before sending,
so the server only needs the standard-library `wave` module plus numpy. Audio
is analysed in memory and never written to disk.
"""
import io
import wave
from typing import Any

import numpy as np

from backend.services import voice_quality


class VoiceAnalysisError(ValueError):
    pass


def _read_wav(data: bytes) -> tuple[np.ndarray, int]:
    try:
        with wave.open(io.BytesIO(data), 'rb') as wav:
            channels = wav.getnchannels()
            width = wav.getsampwidth()
            rate = wav.getframerate()
            frames = wav.readframes(wav.getnframes())
    except (wave.Error, EOFError) as exc:
        raise VoiceAnalysisError('The audio file could not be read. Please record again.') from exc

    if width == 2:
        samples = np.frombuffer(frames, dtype='<i2').astype(np.float32) / 32768.0
    elif width == 1:
        samples = (np.frombuffer(frames, dtype=np.uint8).astype(np.float32) - 128.0) / 128.0
    elif width == 4:
        samples = np.frombuffer(frames, dtype='<i4').astype(np.float32) / 2147483648.0
    else:
        raise VoiceAnalysisError('Unsupported audio encoding.')

    if channels > 1:
        samples = samples[: len(samples) - len(samples) % channels].reshape(-1, channels).mean(axis=1)
    return samples, rate


def _frame_pitch(frame: np.ndarray, rate: int) -> float | None:
    frame = frame - frame.mean()
    energy = float(np.dot(frame, frame))
    if energy <= 1e-8:
        return None
    corr = np.correlate(frame, frame, mode='full')[len(frame) - 1:]
    min_lag, max_lag = int(rate / 400), int(rate / 75)
    if max_lag >= len(corr):
        return None
    segment = corr[min_lag:max_lag]
    lag = int(np.argmax(segment)) + min_lag
    if corr[lag] / corr[0] < 0.3:  # not periodic enough to be voiced speech
        return None
    return rate / lag


def _syllable_count(rms: np.ndarray, voiced: np.ndarray, threshold: float) -> int:
    """Counts syllable nuclei: peaks of the smoothed loudness envelope inside voiced speech.

    Calibrated on real speech at slow, normal and fast rates (Windows TTS voices).
    """
    db = 20 * np.log10(rms)
    smooth = np.convolve(db, np.ones(3) / 3, mode='same')
    floor = 20 * np.log10(threshold)
    count, last_peak = 0, -100
    for i in range(4, len(smooth) - 4):
        if not voiced[i] or smooth[i] < floor + 3:
            continue
        if smooth[i] < smooth[i - 4:i + 5].max():
            continue
        if count and i - last_peak < 7:  # syllables are at least ~70 ms apart
            continue
        # The envelope must dip between neighbouring syllables, otherwise it is one syllable.
        if count and smooth[last_peak:i + 1].min() > min(smooth[last_peak], smooth[i]) - 1.5:
            continue
        count += 1
        last_peak = i
    return count


def extract_features(data: bytes, max_seconds: int, min_seconds: float = 3) -> dict[str, Any]:
    samples, rate = _read_wav(data)
    if rate < 8000:
        raise VoiceAnalysisError('Audio sample rate is too low to analyse.')
    duration = len(samples) / rate
    if duration < min_seconds:
        raise VoiceAnalysisError(f'The recording is too short. Please speak for at least {max(2, int(min_seconds) + 2)} seconds.')
    if duration > max_seconds:
        samples = samples[: int(max_seconds * rate)]
        duration = float(max_seconds)

    frame_len, hop = int(0.03 * rate), int(0.01 * rate)
    count = 1 + (len(samples) - frame_len) // hop
    idx = np.arange(frame_len)[None, :] + hop * np.arange(count)[:, None]
    frames = samples[idx]
    rms = np.sqrt(np.mean(frames ** 2, axis=1) + 1e-12)

    noise_floor = float(np.percentile(rms, 10))
    loud = float(np.percentile(rms, 95))
    # Cap the threshold relative to the loud parts so continuous speech (few pauses) still counts as voiced.
    threshold = max(min(noise_floor * 2.5, loud * 0.3), 10 ** (-48 / 20))
    voiced = rms > threshold
    voiced_seconds = float(voiced.sum()) * hop / rate
    if voiced_seconds < min(1.0, min_seconds * 0.3):
        raise VoiceAnalysisError("We couldn't hear speech clearly. Please record again somewhere quieter, closer to the microphone.")

    first, last = int(np.argmax(voiced)), int(len(voiced) - 1 - np.argmax(voiced[::-1]))
    span = voiced[first:last + 1]
    pause_ratio = float(1.0 - span.mean()) if len(span) else 0.0

    energy_db = float(20 * np.log10(np.mean(rms[voiced])))

    pitches = [p for i in np.flatnonzero(voiced)[::3] if (p := voice_quality.frame_periodicity(frames[i], rate)[0]) is not None]
    pitch_hz = float(np.median(pitches)) if len(pitches) >= 5 else None
    # Pitch movement in semitones: low values sound flat / monotone.
    pitch_variability = None
    if pitch_hz:
        semis = 12 * np.log2(np.array(pitches) / pitch_hz)
        # Fold octave errors (a tracker jumping to half / double pitch) back towards the median.
        semis = np.where(semis > 9, semis - 12, np.where(semis < -9, semis + 12, semis))
        # Robust spread (median absolute deviation) so a few bad frames don't look like expressive speech.
        pitch_variability = float(1.4826 * np.median(np.abs(semis - np.median(semis))))

    # Speaking span = first to last clearly loud frame, so breaths or mic noise at the end don't slow the rate.
    strong = np.flatnonzero(rms > max(threshold, loud * 0.1))
    span_frames = (strong[-1] - strong[0] + 1) if len(strong) else (last - first + 1)
    span_seconds = max(0.3, span_frames * hop / rate)
    syllables = _syllable_count(rms, voiced, threshold)
    # ~1.5 syllables per spoken word in English / Hinglish classroom speech.
    speech_rate = syllables / span_seconds * 60 / 1.5 if syllables >= 2 else None

    return {
        'duration_s': round(duration, 1),
        'energy_db': round(energy_db, 1),
        'pause_ratio': round(pause_ratio, 3),
        'pitch_hz': round(pitch_hz, 1) if pitch_hz else None,
        'pitch_variability_st': round(pitch_variability, 2) if pitch_variability is not None else None,
        'onset_latency_ms': int(round(first * hop / rate * 1000)),
        'speech_rate_wpm': int(round(speech_rate)) if speech_rate else None,
        'syllables': syllables,
        'quality': voice_quality.analyse(frames, rms, voiced, rate, hop / rate),
    }


def deviation_from_baseline(features: dict[str, Any], history: list[dict[str, Any]]) -> float | None:
    """0 = sounds like the student's usual check-ins, 1 = large change (quieter / more pauses).

    Needs at least 3 earlier voice check-ins from the same student; returns None until then.
    """
    if len(history) < 3:
        return None
    base_energy = float(np.mean([h['energy_db'] for h in history]))
    base_pause = float(np.mean([h['pause_ratio'] for h in history]))
    energy_drop = max(0.0, base_energy - features['energy_db']) / 6.0
    pause_increase = max(0.0, features['pause_ratio'] - base_pause) / 0.15
    return round(min(1.0, 0.5 * min(1.0, energy_drop) + 0.5 * min(1.0, pause_increase)), 2)
