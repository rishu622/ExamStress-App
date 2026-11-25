import logging
from datetime import timedelta

from sqlalchemy.orm import Session

from backend.models import CheckIn, Conversation, utcnow
from backend.services.app_settings import get_settings

logger = logging.getLogger('examstress.retention')


def purge_expired(db: Session) -> dict[str, int]:
    days = get_settings(db)['data_retention_days']
    cutoff = utcnow() - timedelta(days=days)
    checkins = db.query(CheckIn).filter(CheckIn.created_at < cutoff).delete(synchronize_session=False)
    chats = (
        db.query(Conversation)
        .filter(Conversation.status == 'closed', Conversation.updated_at < cutoff)
        .delete(synchronize_session=False)
    )
    db.commit()
    if checkins or chats:
        logger.info('Retention purge removed %s check-ins and %s closed conversations', checkins, chats)
    return {'checkins': checkins, 'conversations': chats}
