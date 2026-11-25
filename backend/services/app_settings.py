import json
from typing import Any

from sqlalchemy.orm import Session

from backend.models import Setting

DEFAULT_SETTINGS: dict[str, Any] = {
    'school_name': 'Your School',
    # Wellbeing score (0-100, higher = doing better) lower bounds for each zone.
    'threshold_green_min': 70,
    'threshold_yellow_min': 50,
    'threshold_orange_min': 30,
    # Check-ins and closed chats older than this are deleted automatically.
    'data_retention_days': 180,
    'email_alerts_enabled': True,
    'alert_email_recipients': '',  # extra comma-separated addresses besides counselors
    'helpline_text': (
        'Tele-MANAS (free, 24x7, India): 14416 or 1-800-891-4416. '
        'In an emergency call 112.'
    ),
    'counselor_contact_text': 'Visit the school counselor\'s office, or ask any teacher to contact them for you.',
}

INT_KEYS = {'threshold_green_min', 'threshold_yellow_min', 'threshold_orange_min', 'data_retention_days'}
BOOL_KEYS = {'email_alerts_enabled'}


def get_settings(db: Session) -> dict[str, Any]:
    values = dict(DEFAULT_SETTINGS)
    for row in db.query(Setting).all():
        if row.key in DEFAULT_SETTINGS:
            values[row.key] = json.loads(row.value)
    return values


def validate_settings(values: dict[str, Any]) -> None:
    green, yellow, orange = values['threshold_green_min'], values['threshold_yellow_min'], values['threshold_orange_min']
    if not (0 < orange < yellow < green <= 100):
        raise ValueError('Zone thresholds must satisfy 0 < orange < yellow < green <= 100.')
    if not (7 <= values['data_retention_days'] <= 3650):
        raise ValueError('Data retention must be between 7 and 3650 days.')
    if not str(values['school_name']).strip():
        raise ValueError('School name cannot be empty.')


def update_settings(db: Session, changes: dict[str, Any]) -> dict[str, Any]:
    current = get_settings(db)
    for key, value in changes.items():
        if key not in DEFAULT_SETTINGS or value is None:
            continue
        if key in INT_KEYS:
            value = int(value)
        elif key in BOOL_KEYS:
            value = bool(value)
        else:
            value = str(value).strip()
        current[key] = value
    validate_settings(current)

    for key, value in current.items():
        row = db.get(Setting, key)
        if row is None:
            db.add(Setting(key=key, value=json.dumps(value)))
        else:
            row.value = json.dumps(value)
    db.commit()
    return current


def zone_for_score(score: int, values: dict[str, Any]) -> str:
    if score >= values['threshold_green_min']:
        return 'green'
    if score >= values['threshold_yellow_min']:
        return 'yellow'
    if score >= values['threshold_orange_min']:
        return 'orange'
    return 'red'
