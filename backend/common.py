import secrets
from datetime import datetime

from sqlalchemy.orm import Session

from backend.models import User

ANON_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'


def iso(value: datetime | None) -> str | None:
    """Serialises naive-UTC datetimes so browsers parse them as UTC."""
    return value.isoformat(timespec='seconds') + 'Z' if value else None


def generate_anon_id(db: Session) -> str:
    while True:
        candidate = 'S-' + ''.join(secrets.choice(ANON_ALPHABET) for _ in range(5))
        if not db.query(User.id).filter(User.anon_id == candidate).first():
            return candidate


def user_public(user: User) -> dict:
    return {
        'id': user.id,
        'email': user.email,
        'name': user.name,
        'role': user.role,
        'anon_id': user.anon_id,
        'grade_class': user.grade_class,
        'is_active': user.is_active,
        'must_change_password': user.must_change_password,
        'consent_given': user.consent_given,
        'created_at': iso(user.created_at),
        'last_login_at': iso(user.last_login_at),
    }
