import logging
import smtplib
from email.message import EmailMessage

from fastapi import BackgroundTasks
from sqlalchemy.orm import Session

from backend.config import settings
from backend.models import Alert, User
from backend.services.app_settings import get_settings

logger = logging.getLogger('examstress.notify')

EMAIL_SEVERITIES = {'critical', 'high'}


def _recipients(db: Session) -> list[str]:
    values = get_settings(db)
    addresses = {
        u.email for u in db.query(User).filter(User.role == 'counselor', User.is_active.is_(True)).all()
    }
    for extra in str(values.get('alert_email_recipients', '')).split(','):
        if extra.strip():
            addresses.add(extra.strip())
    return sorted(addresses)


def _send_email(recipients: list[str], subject: str, body: str) -> None:
    if not recipients:
        return
    message = EmailMessage()
    message['Subject'] = subject
    message['From'] = settings.smtp_from
    message['To'] = settings.smtp_from
    message['Bcc'] = ', '.join(recipients)
    message.set_content(body)
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as server:
            if settings.smtp_use_tls:
                server.starttls()
            if settings.smtp_username:
                server.login(settings.smtp_username, settings.smtp_password or '')
            server.send_message(message)
    except Exception:  # noqa: BLE001 - alert e-mail must never break the request
        logger.exception('Failed to send alert e-mail')


def create_alert(
    db: Session,
    background: BackgroundTasks | None,
    *,
    type: str,
    severity: str,
    message: str,
    student: User | None = None,
    conversation_id: str | None = None,
) -> Alert:
    """Adds the alert to the session (caller commits) and queues an e-mail when configured."""
    alert = Alert(
        type=type,
        severity=severity,
        message=message,
        student_id=student.id if student else None,
        conversation_id=conversation_id,
    )
    db.add(alert)

    values = get_settings(db)
    if background is not None and severity in EMAIL_SEVERITIES and values['email_alerts_enabled'] and settings.smtp_configured:
        who = f'student {student.anon_id}' if student and student.anon_id else 'a student'
        subject = f"[{values['school_name']}] {severity.upper()} wellbeing alert for {who}"
        body = (
            f'{message}\n\n'
            'Sign in to the ExamStress counselor dashboard to review and respond.\n'
            'Student names are not included in this e-mail for privacy.'
        )
        background.add_task(_send_email, _recipients(db), subject, body)
    return alert
