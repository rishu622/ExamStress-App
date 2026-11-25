"""Guest mode: a private self-check with no account. Nothing is stored and nobody is alerted."""
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.auth import guest_limiter
from backend.database import get_db
from backend.services import language, scoring
from backend.services.app_settings import get_settings

router = APIRouter()


class GuestCheckIn(BaseModel):
    mood: int = Field(ge=1, le=5)
    stress: int = Field(ge=1, le=5)
    sleep: int = Field(ge=1, le=5)
    note_text: str = Field(default='', max_length=2000)


@router.post('/checkin')
def guest_checkin(payload: GuestCheckIn, request: Request, db: Session = Depends(get_db)):
    values = get_settings(db)
    if not values['guest_access_enabled']:
        raise HTTPException(status_code=403, detail='Guest access is turned off. Please sign in.')
    guest_limiter.check(request, 'guest')
    guest_limiter.record_failure(request, 'guest')

    note = payload.note_text.strip()
    crisis = language.detect_crisis(note) if note else False
    cues = language.detect_cues(note) if note else []
    score = scoring.combine(scoring.self_report_score(payload.mood, payload.stress, payload.sleep), cues, crisis, None)
    tips = scoring.student_feedback(payload.mood, payload.stress, payload.sleep, crisis, cues)
    if crisis:
        # Guests are anonymous, so no counselor can be alerted: say so plainly.
        tips[0] = {
            'kind': 'urgent',
            'title': "You don't have to handle this alone",
            'text': 'What you wrote matters. Because you are using guest mode, nobody at school has been told. '
                    'Please call the helpline below now, or tell a trusted adult or your school counselor today.',
        }
    return {
        'score': score,
        'crisis': crisis,
        'tips': tips,
        'helpline_text': values['helpline_text'],
        'counselor_contact_text': values['counselor_contact_text'],
        'low': score < values['threshold_yellow_min'],
    }
