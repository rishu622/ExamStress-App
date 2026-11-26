"""Wellbeing estimate from a 2-5 second attendance response ("Present, ma'am").

Used by the counselor-facing Attendance Voice Simulator. Each acoustic marker is
compared with a typical classroom range and can only take points away. The audio
is analysed in memory and nothing is stored. Like the rest of ExamStress this is a
screening aid, not a diagnosis: a single short clip is a weak signal on its own.
"""
import re
from typing import Any

from backend.services.voice_quality import strain as vocal_strain

# Typical ranges shown next to each metric in the UI.
NORMS = {
    'pitch_hz': (180, 240),  # school-age speakers; varies a lot with age and sex, so not scored directly
    'speech_rate_wpm': (130, 160),
    'onset_latency_ms': 250,
    'energy_db': -30.0,
    'pitch_variability_st': 2.0,
}

ABSOLUTIST = ['always', 'never', 'nothing', 'ever', 'everything', 'completely', 'totally', 'entirely', 'nobody', 'everyone', 'constantly']


def _scale(value: float, start: float, end: float, max_penalty: float) -> float:
    """0 at `start`, `max_penalty` at `end` (works for rising or falling ranges)."""
    if end == start:
        return 0.0
    fraction = (value - start) / (end - start)
    return max(0.0, min(1.0, fraction)) * max_penalty


def absolutist_words(transcript: str) -> list[str]:
    words = re.findall(r"[a-z']+", transcript.lower())
    return [w for w in words if w in ABSOLUTIST]


def score_response(features: dict[str, Any], transcript: str = '') -> dict[str, Any]:
    penalties: list[tuple[str, float]] = []
    # Rate and intonation need a few syllables to measure; a 2-3 syllable reply counts for half.
    short_clip = (features.get('syllables') or 0) < 4
    weight = 0.5 if short_clip else 1.0

    variability = features.get('pitch_variability_st')
    if variability is not None:
        penalties.append(('Monotone pitch', _scale(variability, 2.0, 0.4, 20 * weight)))

    rate = features.get('speech_rate_wpm')
    if rate is not None:
        penalties.append(('Slow speech', _scale(rate, 130, 75, 18 * weight)))
        penalties.append(('Rushed speech', _scale(rate, 210, 280, 10 * weight)))

    latency = features.get('onset_latency_ms') or 0
    penalties.append(('Delayed response', _scale(latency, 250, 1000, 22)))

    energy = features.get('energy_db')
    if energy is not None:
        penalties.append(('Low vocal energy', _scale(energy, -30, -46, 18)))

    pause = features.get('pause_ratio') or 0
    penalties.append(('Hesitant pauses', _scale(pause, 0.3, 0.65, 10)))

    pitch = features.get('pitch_hz')
    if pitch is not None:
        penalties.append(('Tense, raised pitch', _scale(pitch, 320, 420, 8)))

    # Voice-quality model: crying, trembling, breathy or cracking voice.
    quality = features.get('quality')
    strain = vocal_strain(quality, features.get('pitch_hz')) if quality else None
    if strain:
        for c in strain['contributors']:
            penalties.append((c['label'], c['weight'] * 45))

    absolutes = absolutist_words(transcript) if transcript else []
    if absolutes:
        penalties.append(('Absolutist words', min(12.0, 4.0 * len(absolutes))))

    score = int(round(max(0.0, 100 - sum(p for _, p in penalties))))
    if strain and strain['possible_crying']:
        score = min(score, 35)  # crying is never "doing well", whatever the other markers say
    markers = [{'label': label, 'penalty': round(p, 1)} for label, p in penalties if p >= 1]
    markers.sort(key=lambda m: -m['penalty'])
    return {'score': score, 'markers': markers, 'absolutist_words': absolutes, 'short_clip': short_clip, 'strain': strain}


def describe(features: dict[str, Any], result: dict[str, Any]) -> str:
    parts: list[str] = []
    labels = {m['label'] for m in result['markers']}
    if 'Monotone pitch' in labels:
        parts.append('monotone pitch')
    elif features.get('pitch_variability_st') is not None:
        parts.append('natural pitch movement')
    if features.get('onset_latency_ms') is not None:
        parts.append(f"{features['onset_latency_ms']}ms response latency")
    if features.get('speech_rate_wpm'):
        parts.append(f"~{features['speech_rate_wpm']} words/min")
    if 'Low vocal energy' in labels:
        parts.append('low vocal energy')
    strain = result.get('strain')
    if strain and strain['index'] >= 0.18:
        parts.insert(0, strain['label'].lower())
    if result['absolutist_words']:
        quoted = ', '.join(f'"{w}"' for w in dict.fromkeys(result['absolutist_words']))
        parts.append(f"{len(result['absolutist_words'])} absolutist word{'s' if len(result['absolutist_words']) > 1 else ''} ({quoted})")
    text = ', '.join(parts)
    return (text[0].upper() + text[1:] + '.') if text else 'Not enough clear speech to describe.'
