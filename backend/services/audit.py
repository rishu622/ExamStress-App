import json
from typing import Any

from sqlalchemy.orm import Session

from backend.models import AuditLog, User


def record(db: Session, actor: User | None, action: str, target_id: str | None = None, details: Any = None) -> None:
    """Adds an audit entry to the session; the caller commits."""
    db.add(AuditLog(
        actor_id=actor.id if actor else None,
        action=action,
        target_id=target_id,
        details=json.dumps(details) if details is not None and not isinstance(details, str) else details,
    ))
