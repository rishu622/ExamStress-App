"""Acoustic features from a short spoken check-in.

The browser converts every recording or upload to 16-bit PCM WAV before sending,
so the server only needs the standard-library `wave` module plus numpy. Audio
is analysed in memory and never written to disk.
"""
import io
import wave
from typing import Any

import numpy as np


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


def extract_features(data: bytes, max_seconds: int) -> dict[str, Any]:
    samples, rate = _read_wav(data)
    if rate < 8000:
        raise VoiceAnalysisError('Audio sample rate is too low to analyse.')
    duration = len(samples) / rate
    if duration < 3:
        raise VoiceAnalysisError('The recording is too short. Please speak for at least 5 seconds.')
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
    if voiced_seconds < 1.0:
        raise VoiceAnalysisError("We couldn't hear speech clearly. Please record again somewhere quieter, closer to the microphone.")

    first, last = int(np.argmax(voiced)), int(len(voiced) - 1 - np.argmax(voiced[::-1]))
    span = voiced[first:last + 1]
    pause_ratio = float(1.0 - span.mean()) if len(span) else 0.0

    energy_db = float(20 * np.log10(np.mean(rms[voiced])))

    pitches = [p for i in np.flatnonzero(voiced)[::3] if (p := _frame_pitch(frames[i], rate)) is not None]
    pitch_hz = float(np.median(pitches)) if len(pitches) >= 5 else None

    return {
        'duration_s': round(duration, 1),
        'energy_db': round(energy_db, 1),
        'pause_ratio': round(pause_ratio, 3),
        'pitch_hz': round(pitch_hz, 1) if pitch_hz else None,
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
