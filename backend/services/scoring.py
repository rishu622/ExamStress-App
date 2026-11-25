"""Wellbeing score for one check-in: 0 = needs urgent support, 100 = doing well.

The score is driven by what the student reports (mood, stress, sleep). Written
language and voice changes can only lower it, never raise it, so a worrying
signal is never hidden by a cheerful one.
"""
from typing import Any

CUE_PENALTY = 6
MAX_CUE_PENALTY = 24
MAX_VOICE_PENALTY = 10
CRISIS_CAP = 15


def self_report_score(mood: int, stress: int, sleep: int) -> int:
    mood_part = (mood - 1) / 4
    calm_part = (5 - stress) / 4
    sleep_part = (sleep - 1) / 4
    return int(round((mood_part * 0.4 + calm_part * 0.35 + sleep_part * 0.25) * 100))


def combine(self_score: int, cues: list[str], crisis: bool, voice_deviation: float | None) -> int:
    score = self_score - min(MAX_CUE_PENALTY, CUE_PENALTY * len(cues))
    if voice_deviation is not None:
        score -= int(round(voice_deviation * MAX_VOICE_PENALTY))
    if crisis:
        score = min(score, CRISIS_CAP)
    return max(0, min(100, score))


def student_feedback(mood: int, stress: int, sleep: int, crisis: bool, cues: list[str]) -> list[dict[str, Any]]:
    """Short, supportive suggestions shown to the student after a check-in."""
    tips: list[dict[str, Any]] = []
    if crisis:
        tips.append({'kind': 'urgent', 'title': 'You don\'t have to handle this alone',
                     'text': 'What you wrote matters. A school counselor will be told so they can reach out to you. '
                             'If you might be in danger right now, please call the helpline below or tell a trusted adult immediately.'})
    if stress >= 4 or 'overwhelm' in cues:
        tips.append({'kind': 'stress', 'title': 'Break it into smaller pieces',
                     'text': 'Pick one small task for the next 25 minutes, then take a 5-minute break away from screens. '
                             'Slow breathing (in for 4, hold for 4, out for 6) can take the edge off.'})
    if sleep <= 2 or 'sleep' in cues:
        tips.append({'kind': 'sleep', 'title': 'Protect your sleep',
                     'text': 'Sleep helps memory more than late-night revision. Try to stop studying 30 minutes before bed '
                             'and keep a similar wake-up time each day.'})
    if mood <= 2 or 'low_mood' in cues or 'hopelessness' in cues:
        tips.append({'kind': 'mood', 'title': 'Reach out to someone',
                     'text': 'Talking helps. You can message a trained peer mentor anonymously from the Peer Support page, '
                             'or speak with your school counselor.'})
    if 'safety' in cues:
        tips.append({'kind': 'safety', 'title': 'Your safety matters',
                     'text': 'If someone is hurting or threatening you, please tell a teacher or the school counselor. '
                             'You deserve to feel safe.'})
    if not tips:
        tips.append({'kind': 'positive', 'title': 'Nice work checking in',
                     'text': 'Keep the habits that are working for you: regular breaks, sleep, food and time with friends.'})
    return tips
