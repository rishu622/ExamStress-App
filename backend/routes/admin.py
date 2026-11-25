from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.auth import get_current_user, require_ready_user, require_roles
from backend.common import iso
from backend.config import settings as env_settings
from backend.database import get_db
from backend.models import Alert, AuditLog, CaseNote, CheckIn, StudentCase, User, utcnow
from backend.services import audit
from backend.services.app_settings import get_settings, update_settings
from backend.services.retention import purge_expired

router = APIRouter()
staff = require_roles('counselor', 'admin')
admin_only = require_roles('admin')

ZONES = ('green', 'yellow', 'orange', 'red')


@router.get('/settings/public')
def public_settings(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    values = get_settings(db)
    return {k: values[k] for k in ('school_name', 'helpline_text', 'counselor_contact_text')}


@router.get('/settings', dependencies=[Depends(require_ready_user)])
def read_settings(db: Session = Depends(get_db), _: User = Depends(staff)):
    return {**get_settings(db), 'smtp_configured': env_settings.smtp_configured}


@router.put('/settings', dependencies=[Depends(require_ready_user)])
def write_settings(payload: dict, db: Session = Depends(get_db), actor: User = Depends(admin_only)):
    try:
        values = update_settings(db, payload)
    except (ValueError, TypeError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    audit.record(db, actor, 'settings_updated', None, {k: v for k, v in payload.items() if k != 'smtp_configured'})
    db.commit()
    return {**values, 'smtp_configured': env_settings.smtp_configured}


@router.post('/retention/run', dependencies=[Depends(require_ready_user)])
def run_retention(db: Session = Depends(get_db), actor: User = Depends(admin_only)):
    result = purge_expired(db)
    audit.record(db, actor, 'retention_run', None, result)
    db.commit()
    return result


def _latest_zone_per_student(checkins: list[CheckIn]) -> dict[str, str]:
    latest: dict[str, CheckIn] = {}
    for c in checkins:
        if c.student_id not in latest or c.created_at > latest[c.student_id].created_at:
            latest[c.student_id] = c
    return {sid: c.zone for sid, c in latest.items()}


@router.get('/stats/overview', dependencies=[Depends(require_ready_user)])
def overview(db: Session = Depends(get_db), _: User = Depends(staff)):
    now = utcnow()
    week_ago = now - timedelta(days=7)
    student_ids = {sid for (sid,) in db.query(User.id).filter(User.role == 'student', User.is_active.is_(True)).all()}
    checkins = [c for c in db.query(CheckIn).filter(CheckIn.created_at >= now - timedelta(days=28)).all() if c.student_id in student_ids]
    escalated = {sid for (sid,) in db.query(StudentCase.student_id).filter(StudentCase.escalated.is_(True)).all()}

    # Current distribution: each student's most recent check-in (all time), escalations count as red.
    latest_all = {}
    for c in db.query(CheckIn).order_by(CheckIn.created_at).all():
        if c.student_id in student_ids:
            latest_all[c.student_id] = c.zone
    for sid in escalated & student_ids:
        latest_all[sid] = 'red'
    distribution = {z: 0 for z in ZONES}
    for zone in latest_all.values():
        distribution[zone] += 1

    weekly = []
    for weeks_back in range(3, -1, -1):
        start = now - timedelta(days=7 * (weeks_back + 1))
        end = now - timedelta(days=7 * weeks_back)
        zones = _latest_zone_per_student([c for c in checkins if start <= c.created_at < end])
        counts = {z: 0 for z in ZONES}
        for zone in zones.values():
            counts[zone] += 1
        weekly.append({'week_start': iso(start), 'label': 'This week' if weeks_back == 0 else f'{weeks_back} wk ago',
                       'checked_in': len(zones), **counts})

    daily = []
    for days_back in range(13, -1, -1):
        day = (now - timedelta(days=days_back)).date()
        daily.append({'date': day.isoformat(), 'count': sum(1 for c in checkins if c.created_at.date() == day)})

    open_alerts = db.query(Alert).filter(Alert.resolved_at.is_(None)).all()
    interventions = db.query(CaseNote).filter(CaseNote.created_at >= week_ago, CaseNote.action_type.in_(('contact', 'escalate'))).count()
    active_this_week = {c.student_id for c in checkins if c.created_at >= week_ago}

    return {
        'total_students': len(student_ids),
        'students_with_data': len(latest_all),
        'active_this_week': len(active_this_week),
        'checkins_this_week': sum(1 for c in checkins if c.created_at >= week_ago),
        'consented_students': db.query(User).filter(User.role == 'student', User.is_active.is_(True), User.consent_given.is_(True)).count(),
        'distribution': distribution,
        'escalated': len(escalated & student_ids),
        'open_alerts': {
            'total': len(open_alerts),
            'critical': sum(1 for a in open_alerts if a.severity == 'critical'),
            'high': sum(1 for a in open_alerts if a.severity == 'high'),
        },
        'interventions_this_week': interventions,
        'weekly': weekly,
        'daily_checkins': daily,
        'staff': {
            role: db.query(User).filter(User.role == role, User.is_active.is_(True)).count()
            for role in ('counselor', 'peer-mentor', 'admin')
        },
        'generated_at': iso(now),
    }


@router.get('/audit', dependencies=[Depends(require_ready_user)])
def audit_log(limit: int = 200, action: str | None = None, db: Session = Depends(get_db), _: User = Depends(admin_only)):
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action)
    rows = query.order_by(AuditLog.created_at.desc()).limit(min(limit, 1000)).all()
    targets = {r.target_id for r in rows if r.target_id}
    anon = dict(db.query(User.id, User.anon_id).filter(User.id.in_(targets)).all()) if targets else {}
    return [{
        'id': r.id,
        'created_at': iso(r.created_at),
        'actor_name': r.actor.name if r.actor else 'System / deleted user',
        'actor_role': r.actor.role if r.actor else None,
        'action': r.action,
        'target': anon.get(r.target_id) or (r.target_id[:8] if r.target_id else None),
        'details': r.details,
    } for r in rows]
