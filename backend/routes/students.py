import json
from datetime import timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.auth import require_ready_user, require_roles
from backend.common import iso
from backend.database import get_db
from backend.models import Alert, CaseNote, CheckIn, StudentCase, User, utcnow
from backend.services import audit
from backend.services.notify import create_alert

router = APIRouter(dependencies=[Depends(require_ready_user)])
staff = require_roles('counselor', 'admin')

NOTE_TYPES = ('note', 'contact')


class RevealRequest(BaseModel):
    reason: str


class NoteRequest(BaseModel):
    text: str
    action_type: str = 'note'


class EscalateRequest(BaseModel):
    reason: str


class ResolveRequest(BaseModel):
    note: str = ''


def _student_or_404(db: Session, student_id: str) -> User:
    student = db.get(User, student_id)
    if not student or student.role != 'student':
        raise HTTPException(status_code=404, detail='Student not found.')
    return student


def _case(db: Session, student_id: str) -> StudentCase:
    case = db.get(StudentCase, student_id)
    if case is None:
        case = StudentCase(student_id=student_id)
        db.add(case)
        db.flush()
    return case


def _trend(scores: list[int]) -> str:
    """Compares the latest score with the average of the previous three."""
    if len(scores) < 2:
        return 'stable'
    previous = scores[-4:-1]
    delta = scores[-1] - sum(previous) / len(previous)
    if delta >= 8:
        return 'up'
    if delta <= -8:
        return 'down'
    return 'stable'


def _days_in_zone(checkins: list[CheckIn]) -> int:
    if not checkins:
        return 0
    zone, since = checkins[-1].zone, checkins[-1].created_at
    for c in reversed(checkins):
        if c.zone != zone:
            break
        since = c.created_at
    return max(0, (utcnow() - since).days)


def _summarise(student: User, checkins: list[CheckIn], case: StudentCase | None, open_alerts: int) -> dict:
    latest = checkins[-1] if checkins else None
    previous = checkins[-2] if len(checkins) > 1 else None
    escalated = bool(case and case.escalated)
    zone = 'red' if escalated else (latest.zone if latest else None)
    return {
        'id': student.id,
        'anon_id': student.anon_id,
        'grade_class': student.grade_class,
        'is_active': student.is_active,
        'consent_given': student.consent_given,
        'score': latest.score if latest else None,
        'zone': zone,
        'previous_zone': previous.zone if previous else None,
        'trend': _trend([c.score for c in checkins]),
        'last_checkin_at': iso(latest.created_at) if latest else None,
        'days_in_zone': _days_in_zone(checkins),
        'escalated': escalated,
        'last_contacted_at': iso(case.last_contacted_at) if case else None,
        'open_alerts': open_alerts,
        'sparkline': [c.score for c in checkins[-10:]],
        'crisis_flag': bool(latest and latest.crisis_language),
    }


@router.get('')
def list_students(db: Session = Depends(get_db), _: User = Depends(staff)):
    students = db.query(User).filter(User.role == 'student').all()
    cutoff = utcnow() - timedelta(days=90)
    by_student: dict[str, list[CheckIn]] = {}
    for c in db.query(CheckIn).filter(CheckIn.created_at >= cutoff).order_by(CheckIn.created_at).all():
        by_student.setdefault(c.student_id, []).append(c)
    cases = {c.student_id: c for c in db.query(StudentCase).all()}
    alert_counts = dict(
        db.query(Alert.student_id, func.count(Alert.id))
        .filter(Alert.resolved_at.is_(None), Alert.student_id.isnot(None))
        .group_by(Alert.student_id).all()
    )
    return [
        _summarise(s, by_student.get(s.id, []), cases.get(s.id), alert_counts.get(s.id, 0))
        for s in students
    ]


@router.get('/{student_id}')
def student_detail(student_id: str, db: Session = Depends(get_db), _: User = Depends(staff)):
    student = _student_or_404(db, student_id)
    checkins = (
        db.query(CheckIn).filter(CheckIn.student_id == student.id)
        .order_by(CheckIn.created_at.desc()).limit(60).all()
    )[::-1]
    case = db.get(StudentCase, student.id)
    notes = (
        db.query(CaseNote).filter(CaseNote.student_id == student.id)
        .order_by(CaseNote.created_at.desc()).all()
    )
    open_alerts = db.query(Alert).filter(Alert.student_id == student.id, Alert.resolved_at.is_(None)).count()

    return {
        **_summarise(student, checkins, case, open_alerts),
        'escalation_reason': case.escalation_reason if case and case.escalated else None,
        'history': [{
            'id': c.id,
            'created_at': iso(c.created_at),
            'score': c.score,
            'zone': c.zone,
            'mood': c.mood,
            'stress': c.stress,
            'sleep': c.sleep,
            'self_report_score': c.self_report_score,
            'note_text': c.note_text,
            'language_flags': json.loads(c.language_flags) if c.language_flags else [],
            'crisis_language': c.crisis_language,
            'voice_energy_db': c.voice_energy_db,
            'voice_pause_ratio': c.voice_pause_ratio,
            'voice_pitch_hz': c.voice_pitch_hz,
            'voice_deviation': c.voice_deviation,
        } for c in checkins],
        'notes': [{
            'id': n.id,
            'created_at': iso(n.created_at),
            'action_type': n.action_type,
            'text': n.text,
            'author_name': n.author.name if n.author else 'Former staff member',
        } for n in notes],
    }


@router.post('/{student_id}/reveal')
def reveal_identity(student_id: str, payload: RevealRequest, db: Session = Depends(get_db), actor: User = Depends(staff)):
    student = _student_or_404(db, student_id)
    reason = payload.reason.strip()
    if len(reason) < 10:
        raise HTTPException(status_code=400, detail='Please give a reason (at least 10 characters). It is recorded in the audit log.')
    audit.record(db, actor, 'identity_revealed', student.id, {'reason': reason, 'anon_id': student.anon_id})
    db.commit()
    return {'name': student.name, 'email': student.email, 'grade_class': student.grade_class}


@router.post('/{student_id}/notes', status_code=201)
def add_note(student_id: str, payload: NoteRequest, db: Session = Depends(get_db), actor: User = Depends(staff)):
    student = _student_or_404(db, student_id)
    text = payload.text.strip()
    if payload.action_type not in NOTE_TYPES:
        raise HTTPException(status_code=400, detail='Invalid note type.')
    if not text:
        if payload.action_type != 'contact':
            raise HTTPException(status_code=400, detail='Note cannot be empty.')
        text = 'Counselor checked in with the student.'
    db.add(CaseNote(student_id=student.id, author_id=actor.id, action_type=payload.action_type, text=text[:4000]))
    if payload.action_type == 'contact':
        case = _case(db, student.id)
        case.last_contacted_at = utcnow()
        case.updated_at = utcnow()
    db.commit()
    return {'message': 'Saved.'}


@router.post('/{student_id}/escalate')
def escalate(student_id: str, payload: EscalateRequest, background: BackgroundTasks, db: Session = Depends(get_db), actor: User = Depends(staff)):
    student = _student_or_404(db, student_id)
    reason = payload.reason.strip()
    if not reason:
        raise HTTPException(status_code=400, detail='Please describe why you are escalating.')
    case = _case(db, student.id)
    case.escalated = True
    case.escalation_reason = reason
    case.updated_at = utcnow()
    db.add(CaseNote(student_id=student.id, author_id=actor.id, action_type='escalate', text=f'Escalated to priority (red): {reason}'))
    create_alert(db, background, type='escalation', severity='critical', student=student,
                 message=f'{actor.name} escalated student {student.anon_id} to priority review: {reason}')
    audit.record(db, actor, 'student_escalated', student.id, {'reason': reason})
    db.commit()
    return {'message': 'Escalated.'}


@router.post('/{student_id}/resolve-escalation')
def resolve_escalation(student_id: str, payload: ResolveRequest, db: Session = Depends(get_db), actor: User = Depends(staff)):
    student = _student_or_404(db, student_id)
    case = _case(db, student.id)
    if not case.escalated:
        raise HTTPException(status_code=400, detail='This student is not currently escalated.')
    case.escalated = False
    case.escalation_reason = None
    case.updated_at = utcnow()
    db.add(CaseNote(student_id=student.id, author_id=actor.id, action_type='resolve',
                    text=f'Escalation resolved. {payload.note.strip()}'.strip()))
    audit.record(db, actor, 'escalation_resolved', student.id)
    db.commit()
    return {'message': 'Escalation resolved.'}
