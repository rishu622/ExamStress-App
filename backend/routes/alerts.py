from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.auth import require_ready_user, require_roles
from backend.common import iso
from backend.database import get_db
from backend.models import Alert, User, utcnow
from backend.services import audit

router = APIRouter(dependencies=[Depends(require_ready_user)])
staff = require_roles('counselor', 'admin')


def _serialise(alert: Alert, anon: dict[str, str]) -> dict:
    return {
        'id': alert.id,
        'student_id': alert.student_id,
        'student_anon_id': anon.get(alert.student_id) if alert.student_id else None,
        'conversation_id': alert.conversation_id,
        'type': alert.type,
        'severity': alert.severity,
        'message': alert.message,
        'is_read': alert.is_read,
        'resolved_at': iso(alert.resolved_at),
        'created_at': iso(alert.created_at),
    }


@router.get('')
def list_alerts(status: str = 'open', limit: int = 100, db: Session = Depends(get_db), _: User = Depends(staff)):
    query = db.query(Alert)
    if status == 'open':
        query = query.filter(Alert.resolved_at.is_(None))
    alerts = query.order_by(Alert.created_at.desc()).limit(min(limit, 500)).all()
    ids = {a.student_id for a in alerts if a.student_id}
    anon = dict(db.query(User.id, User.anon_id).filter(User.id.in_(ids)).all()) if ids else {}
    return {
        'alerts': [_serialise(a, anon) for a in alerts],
        'unread_count': db.query(Alert).filter(Alert.is_read.is_(False), Alert.resolved_at.is_(None)).count(),
    }


@router.post('/read-all')
def mark_all_read(db: Session = Depends(get_db), _: User = Depends(staff)):
    db.query(Alert).filter(Alert.is_read.is_(False)).update({Alert.is_read: True}, synchronize_session=False)
    db.commit()
    return {'message': 'All alerts marked as read.'}


@router.post('/{alert_id}/read')
def mark_read(alert_id: str, db: Session = Depends(get_db), _: User = Depends(staff)):
    alert = db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail='Alert not found.')
    alert.is_read = True
    db.commit()
    return {'message': 'Marked as read.'}


@router.post('/{alert_id}/resolve')
def resolve(alert_id: str, db: Session = Depends(get_db), actor: User = Depends(staff)):
    alert = db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail='Alert not found.')
    alert.is_read = True
    alert.resolved_at = utcnow()
    alert.resolved_by = actor.id
    audit.record(db, actor, 'alert_resolved', alert.student_id, {'alert_id': alert.id, 'type': alert.type})
    db.commit()
    return {'message': 'Alert resolved.'}
