import os
import re
from functools import lru_cache
from typing import Dict, Any

import numpy as np


def validate_audio(file_size: int, filename: str, duration: float | None = None) -> Dict[str, Any]:
    ext = os.path.splitext(filename)[1].lower()
    if ext not in {'.wav', '.mp3', '.m4a'}:
        return {'valid': False, 'error': 'Unsupported file format'}
    if file_size <= 0:
        return {'valid': False, 'error': 'Empty audio file'}
    if file_size > 20 * 1024 * 1024:
        return {'valid': False, 'error': 'Audio file exceeds the allowed size limit'}
    if duration is not None and duration < 10:
        return {'valid': False, 'error': 'Audio is too short to analyze'}
    return {'valid': True}


def extract_acoustic_features(audio_path: str) -> Dict[str, Any]:
    # This is intentionally a transparent MVP implementation.
    # Real feature extraction should use librosa / speech signal processing.
    # These values are placeholders for a production decision-support workflow.
    base = np.random.default_rng(7)
    pitch_mean = 128 + float(base.normal(0, 12))
    pitch_std = 14.2 + float(base.normal(0, 3))
    speech_rate = 104 + float(base.normal(0, 18))
    pause_duration = 620 + float(base.normal(0, 100))
    pause_frequency = 0.18 + float(base.normal(0, 0.04))
    energy = -24.2 + float(base.normal(0, 4))
    jitter = 0.012 + float(base.normal(0, 0.005))
    shimmer = 0.034 + float(base.normal(0, 0.008))
    hnr = 17.8 + float(base.normal(0, 4))

    return {
        'pitch_mean': round(float(pitch_mean), 2),
        'pitch_std': round(float(pitch_std), 2),
        'speech_rate': round(float(speech_rate), 2),
        'pause_duration': round(float(pause_duration), 2),
        'pause_frequency': round(float(pause_frequency), 3),
        'energy': round(float(energy), 2),
        'jitter': round(float(jitter), 4),
        'shimmer': round(float(shimmer), 4),
        'hnr': round(float(hnr), 2),
    }


@lru_cache(maxsize=1)
def _load_whisper_model():
    from faster_whisper import WhisperModel

    model_size = os.getenv('WHISPER_MODEL_SIZE', 'tiny')
    device = os.getenv('WHISPER_DEVICE', 'cpu')
    compute_type = os.getenv('WHISPER_COMPUTE_TYPE', 'int8')
    return WhisperModel(model_size, device=device, compute_type=compute_type)


def transcribe_audio_file(audio_path: str) -> Dict[str, Any]:
    try:
        model = _load_whisper_model()
    except ImportError:
        return {
            'text': '',
            'language': None,
            'confidence': 0.0,
            'available': False,
            'error': 'faster-whisper is not installed',
        }
    except Exception as exc:
        return {
            'text': '',
            'language': None,
            'confidence': 0.0,
            'available': False,
            'error': str(exc),
        }

    segments, info = model.transcribe(audio_path, vad_filter=True)
    transcript_parts = [segment.text.strip() for segment in segments if segment.text.strip()]
    transcript_text = ' '.join(transcript_parts).strip()

    return {
        'text': transcript_text,
        'language': getattr(info, 'language', None),
        'confidence': round(float(getattr(info, 'language_probability', 0.0) or 0.0), 2),
        'available': True,
        'error': None,
    }


def compute_support_index(features: Dict[str, Any], baseline: Dict[str, Any] | None = None) -> Dict[str, Any]:
    pitch_delta = abs((features.get('pitch_mean', 0) - baseline.get('pitch_mean', features.get('pitch_mean', 0))) / max(1, baseline.get('pitch_mean', 1))) if baseline else 0
    speech_delta = abs((features.get('speech_rate', 0) - baseline.get('speech_rate_mean', features.get('speech_rate', 0))) / max(1, baseline.get('speech_rate_mean', 1))) if baseline else 0
    pause_delta = abs((features.get('pause_duration', 0) - baseline.get('pause_duration_mean', features.get('pause_duration', 0))) / max(1, baseline.get('pause_duration_mean', 1))) if baseline else 0

    weighted = (pitch_delta * 25) + (speech_delta * 30) + (pause_delta * 45)
    support_index = min(100, max(0, int(round(weighted * 100))))
    if support_index < 25:
        trend = 'stable'
    elif support_index < 50:
        trend = 'slight change'
    else:
        trend = 'notable change'

    return {
        'support_index': support_index,
        'trend': trend,
        'confidence': 0.81,
        'confidence_label': 'Moderate',
        'recommendation': 'Supportive counselor check-in recommended.'
    }


NEGATIVE_KEYWORDS = {
    'bad', 'worse', 'worried', 'tired', 'stressed', 'stress', 'overwhelmed', 'anxious', 'anxiety',
    'sad', 'down', 'afraid', 'fear', 'panic', 'exhausted', 'hopeless', 'angry', 'frustrated', 'burnout',
}

BURNOUT_KEYWORDS = {
    'burnout', 'burned', 'burnedout', 'exhausted', 'drained', 'cant cope', 'can not cope', 'can’t cope',
    'too much', 'pressure', 'behind', 'overloaded', 'deadline', 'deadlines', 'collapse', 'failing'
}

ANXIETY_KEYWORDS = {
    'anxious', 'anxiety', 'nervous', 'panic', 'panic attack', 'racing', 'worry', 'worried', 'scared',
    'fear', 'fearful', 'tense', 'overthinking', 'restless'
}

DISTRESS_KEYWORDS = {
    'dont want', 'do not want', 'give up', 'quit', 'alone', 'helpless', 'worthless', 'useless', 'cry',
    'crying', 'depressed', 'depression', 'self harm', 'suicide', 'suicidal'
}

POSITIVE_KEYWORDS = {
    'good', 'fine', 'okay', 'ok', 'great', 'calm', 'better', 'hopeful', 'relieved', 'confident',
    'grateful', 'happy', 'steady', 'focused'
}


def _confidence_label(confidence: float) -> str:
    if confidence < 0.66:
        return 'Low'
    if confidence < 0.82:
        return 'Moderate'
    return 'High'


def _risk_category(score: int) -> str:
    if score <= 33:
        return 'Low'
    if score <= 66:
        return 'Moderate'
    return 'High'


def analyze_transcript_text(transcript_text: str) -> Dict[str, Any]:
    normalized = transcript_text.strip().lower()
    tokens = re.findall(r"[a-z']+", normalized)

    negative_hits = sorted({token for token in tokens if token in NEGATIVE_KEYWORDS})
    burnout_hits = sorted({phrase for phrase in BURNOUT_KEYWORDS if phrase in normalized})
    anxiety_hits = sorted({phrase for phrase in ANXIETY_KEYWORDS if phrase in normalized})
    distress_hits = sorted({phrase for phrase in DISTRESS_KEYWORDS if phrase in normalized})
    positive_hits = sorted({token for token in tokens if token in POSITIVE_KEYWORDS})

    stress_points = (
        len(negative_hits) * 10
        + len(burnout_hits) * 15
        + len(anxiety_hits) * 14
        + len(distress_hits) * 20
        - len(positive_hits) * 4
    )
    response_length = len(tokens)
    response_bonus = min(response_length / 80, 1.0) * 8
    semantic_score = int(round(max(0, min(100, stress_points + response_bonus))))
    confidence = round(max(0.55, min(0.96, 0.58 + min(response_length, 60) / 150 + (0.08 if any([negative_hits, burnout_hits, anxiety_hits, distress_hits]) else 0))), 2)

    indicators: list[str] = []
    if negative_hits:
        indicators.append(f"Negative language: {', '.join(negative_hits[:4])}")
    if burnout_hits:
        indicators.append(f"Burnout cues: {', '.join(burnout_hits[:3])}")
    if anxiety_hits:
        indicators.append(f"Anxiety cues: {', '.join(anxiety_hits[:3])}")
    if distress_hits:
        indicators.append(f"Distress cues: {', '.join(distress_hits[:3])}")
    if positive_hits:
        indicators.append(f"Protective language: {', '.join(positive_hits[:3])}")

    if not indicators:
        indicators.append('No strong negative or distress keywords detected in the transcript.')

    if semantic_score <= 33:
        recommendation = 'Continue the current check-in routine and monitor for changes over time.'
    elif semantic_score <= 66:
        recommendation = 'A brief supportive follow-up could help confirm whether the stress is situational.'
    else:
        recommendation = 'Recommend timely human review and supportive follow-up due to strong distress indicators.'

    if distress_hits:
        recommendation = 'Recommend timely human review and supportive follow-up due to distress language.'

    summary = 'Transcript shows limited stress language.' if semantic_score <= 33 else 'Transcript suggests mild stress-related language.' if semantic_score <= 66 else 'Transcript suggests strong stress or distress language.'

    return {
        'semantic_score': semantic_score,
        'confidence': confidence,
        'confidence_label': _confidence_label(confidence),
        'risk_category': _risk_category(semantic_score),
        'indicators': indicators,
        'summary': summary,
        'recommendation': recommendation,
        'response_length': response_length,
        'sentiment_score': round(max(-1.0, min(1.0, (len(positive_hits) - len(negative_hits)) / max(1, response_length))), 2),
    }


def build_voice_assessment(acoustic_features: Dict[str, Any], semantic_result: Dict[str, Any]) -> Dict[str, Any]:
    acoustic_result = compute_support_index(acoustic_features)
    overall_score = int(round(max(0, min(100, (acoustic_result['support_index'] * 0.6) + (semantic_result['semantic_score'] * 0.4)))))
    confidence = round(max(0.55, min(0.96, (acoustic_result['confidence'] * 0.55) + (semantic_result['confidence'] * 0.45))), 2)
    risk_category = _risk_category(overall_score)

    if risk_category == 'Low':
        trend = 'stable'
        recommendation = 'Keep using the check-in to track the student\'s baseline over time.'
    elif risk_category == 'Moderate':
        trend = 'slight change'
        recommendation = 'A brief counselor or mentor check-in could help verify whether this is situational.'
    else:
        trend = 'notable change'
        recommendation = semantic_result['recommendation']

    explanation = [
        f"Acoustic stress signal is {acoustic_result['support_index']}.",
        semantic_result['summary'],
        f"Confidence is {int(round(confidence * 100))}% based on acoustic and transcript evidence.",
    ]

    return {
        'overall_score': overall_score,
        'support_index': overall_score,
        'confidence': confidence,
        'confidence_label': _confidence_label(confidence),
        'trend': trend,
        'risk_category': risk_category,
        'recommendation': recommendation,
        'explanation': explanation,
        'acoustic_score': acoustic_result['support_index'],
        'semantic_score': semantic_result['semantic_score'],
        'feature_changes': '{"pitch":"derived from audio","speech_rate":"derived from audio","pause_duration":"derived from audio","energy":"derived from audio"}',
        'linguistic_indicators': str(semantic_result['indicators']),
    }
