import json
from datetime import timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from backend.auth import require_ready_user, require_roles
from backend.common import iso
from backend.config import settings
from backend.database import get_db
from backend.models import CheckIn, User, utcnow
from backend.services import audit, language, scoring
from backend.services.app_settings import get_settings, zone_for_score
from backend.services.notify import create_alert
from backend.services.voice import VoiceAnalysisError, deviation_from_baseline, extract_features

router = APIRouter(dependencies=[Depends(require_ready_user)])
student_only = require_roles('student')

ZONE_ORDER = {'green': 0, 'yellow': 1, 'orange': 2, 'red': 3}
MAX_NOTE_LENGTH = 2000


def checkin_for_student(c: CheckIn) -> dict:
    """What the student sees about their own check-in (no zone labels)."""
    return {
        'id': c.id,
        'created_at': iso(c.created_at),
        'mood': c.mood,
        'stress': c.stress,
        'sleep': c.sleep,
        'score': c.score,
        'note_text': c.note_text,
        'has_voice': c.voice_energy_db is not None,
        'voice': {
            'duration_s': c.voice_duration_s,
            'pitch_hz': c.voice_pitch_hz,
            'energy_db': c.voice_energy_db,
            'pause_ratio': c.voice_pause_ratio,
            'deviation': c.voice_deviation,
        } if c.voice_energy_db is not None else None,
    }


@router.post('/consent')
def give_consent(db: Session = Depends(get_db), user: User = Depends(student_only)):
    user.consent_given = True
    user.consent_at = utcnow()
    audit.record(db, user, 'consent_given', user.id)
    db.commit()
    return {'consent_given': True}


@router.post('/consent/withdraw')
def withdraw_consent(db: Session = Depends(get_db), user: User = Depends(student_only)):
    user.consent_given = False
    audit.record(db, user, 'consent_withdrawn', user.id)
    db.commit()
    return {'consent_given': False}


@router.get('/summary')
def summary(db: Session = Depends(get_db), user: User = Depends(student_only)):
    checkins = (
        db.query(CheckIn).filter(CheckIn.student_id == user.id)
        .order_by(CheckIn.created_at.desc()).limit(60).all()
    )
    week_ago = utcnow() - timedelta(days=7)
    this_week = [c for c in checkins if c.created_at >= week_ago]
    voice_count = sum(1 for c in checkins if c.voice_energy_db is not None)
    latest = checkins[0] if checkins else None
    return {
        'consent_given': user.consent_given,
        'total_checkins': len(checkins),
        'checkins_this_week': len(this_week),
        'average_score_this_week': round(sum(c.score for c in this_week) / len(this_week)) if this_week else None,
        'voice_baseline_count': min(voice_count, 3),
        'latest': checkin_for_student(latest) if latest else None,
        'checked_in_today': bool(latest and latest.created_at.date() == utcnow().date()),
        'history': [checkin_for_student(c) for c in reversed(checkins[:30])],
    }


@router.post('/checkins', status_code=201)
async def create_checkin(
    background: BackgroundTasks,
    mood: int = Form(...),
    stress: int = Form(...),
    sleep: int = Form(...),
    note_text: str = Form(''),
    audio: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    user: User = Depends(student_only),
):
    if not user.consent_given:
        raise HTTPException(status_code=403, detail='Please read and accept the privacy notice before checking in.')
    for label, value in (('mood', mood), ('stress', stress), ('sleep', sleep)):
        if not 1 <= value <= 5:
            raise HTTPException(status_code=400, detail=f'{label} must be between 1 and 5.')
    note_text = note_text.strip()[:MAX_NOTE_LENGTH]

    recent = db.query(CheckIn).filter(CheckIn.student_id == user.id, CheckIn.created_at >= utcnow() - timedelta(minutes=2)).first()
    if recent:
        raise HTTPException(status_code=429, detail='You just checked in. Please wait a couple of minutes before checking in again.')

    features = None
    deviation = None
    if audio is not None and audio.filename:
        data = await audio.read()
        if len(data) > settings.max_audio_size_mb * 1024 * 1024:
            raise HTTPException(status_code=413, detail='The recording is too large.')
        try:
            features = extract_features(data, settings.max_audio_seconds)
        except VoiceAnalysisError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        history = [
            {'energy_db': c.voice_energy_db, 'pause_ratio': c.voice_pause_ratio}
            for c in db.query(CheckIn)
            .filter(CheckIn.student_id == user.id, CheckIn.voice_energy_db.isnot(None))
            .order_by(CheckIn.created_at.desc()).limit(10).all()
        ]
        deviation = deviation_from_baseline(features, history)

    crisis = language.detect_crisis(note_text) if note_text else False
    cues = language.detect_cues(note_text) if note_text else []
    self_score = scoring.self_report_score(mood, stress, sleep)
    score = scoring.combine(self_score, cues, crisis, deviation)
    values = get_settings(db)
    zone = zone_for_score(score, values)

    previous = db.query(CheckIn).filter(CheckIn.student_id == user.id).order_by(CheckIn.created_at.desc()).first()

    checkin = CheckIn(
        student_id=user.id, mood=mood, stress=stress, sleep=sleep, note_text=note_text or None,
        score=score, zone=zone, self_report_score=self_score,
        language_flags=json.dumps(cues) if cues else None, crisis_language=crisis,
        voice_duration_s=features['duration_s'] if features else None,
        voice_pitch_hz=features['pitch_hz'] if features else None,
        voice_energy_db=features['energy_db'] if features else None,
        voice_pause_ratio=features['pause_ratio'] if features else None,
        voice_deviation=deviation,
    )
    db.add(checkin)

    if crisis:
        create_alert(db, background, type='crisis_language', severity='critical', student=user,
                     message=f'Student {user.anon_id} used language suggesting possible self-harm or suicidal thoughts in a check-in. Please reach out promptly.')
    elif zone in ('orange', 'red') and (previous is None or ZONE_ORDER[zone] > ZONE_ORDER[previous.zone]):
        moved = f'from {previous.zone} to {zone}' if previous else f'into the {zone} zone on their first check-in'
        create_alert(db, background, type='zone_shift', severity='critical' if zone == 'red' else 'high', student=user,
                     message=f'Student {user.anon_id} moved {moved} (wellbeing score {score}/100).')
    elif 'safety' in cues:
        create_alert(db, background, type='zone_shift', severity='high', student=user,
                     message=f'Student {user.anon_id} mentioned something that may be a safety concern (e.g. bullying or abuse) in a check-in.')

    db.commit()
    db.refresh(checkin)

    return {
        'checkin': checkin_for_student(checkin),
        'crisis': crisis,
        'tips': scoring.student_feedback(mood, stress, sleep, crisis, cues),
        'helpline_text': values['helpline_text'] if crisis or zone == 'red' else None,
        'voice_baseline_ready': deviation is not None,
    }
