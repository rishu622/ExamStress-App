from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from backend.auth import require_ready_user, require_roles
from backend.config import settings
from backend.database import get_db
from backend.models import User
from backend.services import audit, language
from backend.services.app_settings import get_settings, zone_for_score
from backend.services.attendance import NORMS, describe, score_response
from backend.services.voice import VoiceAnalysisError, extract_features

router = APIRouter(dependencies=[Depends(require_ready_user)])
staff = require_roles('counselor', 'admin')


@router.post('/analyze')
async def analyze_attendance(
    audio: UploadFile = File(...),
    transcript: str = Form(''),
    label: str = Form(''),
    db: Session = Depends(get_db),
    user: User = Depends(staff),
):
    """Attendance Voice Simulator: analyses one short clip in memory. Nothing is stored."""
    data = await audio.read()
    if len(data) > settings.max_audio_size_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail='The recording is too large.')
    try:
        features = extract_features(data, max_seconds=30, min_seconds=1.0)
    except VoiceAnalysisError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    transcript = transcript.strip()[:500]
    result = score_response(features, transcript)
    crisis = language.detect_crisis(transcript) if transcript else False
    score = min(result['score'], 15) if crisis else result['score']
    values = get_settings(db)
    audit.record(db, user, 'voice_simulator_run', None, {'label': label[:60] or 'recording'})
    db.commit()
    return {
        'label': label[:60] or None,
        'features': features,
        'score': score,
        'zone': zone_for_score(score, values),
        'markers': result['markers'],
        'absolutist_words': result['absolutist_words'],
        'transcript': transcript or None,
        'crisis_language': crisis,
        'summary': describe(features, result),
        'short_clip': result['short_clip'],
        'vocal_strain': result['strain'],
        'norms': NORMS,
        'thresholds': {
            'green': values['threshold_green_min'],
            'yellow': values['threshold_yellow_min'],
            'orange': values['threshold_orange_min'],
        },
    }
