from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from backend.database import Base

ROLES = ('student', 'peer-mentor', 'counselor', 'admin')
STAFF_ROLES = ('counselor', 'admin')


def utcnow() -> datetime:
    # Stored as naive UTC so SQLite and Postgres behave the same.
    return datetime.now(timezone.utc).replace(tzinfo=None)


def new_id() -> str:
    return str(uuid4())


class User(Base):
    __tablename__ = 'users'

    id = Column(String, primary_key=True, default=new_id)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    # Pseudonymous identifier shown to counselors instead of the real name (students only).
    anon_id = Column(String, unique=True, index=True, nullable=True)
    grade_class = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    must_change_password = Column(Boolean, default=True, nullable=False)
    consent_given = Column(Boolean, default=False, nullable=False)
    consent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    last_login_at = Column(DateTime, nullable=True)
    # Incremented to invalidate all existing tokens (password change, deactivation).
    token_version = Column(Integer, default=0, nullable=False)


class CheckIn(Base):
    __tablename__ = 'checkins'

    id = Column(String, primary_key=True, default=new_id)
    student_id = Column(String, ForeignKey('users.id', ondelete='CASCADE'), index=True, nullable=False)
    created_at = Column(DateTime, default=utcnow, index=True, nullable=False)

    mood = Column(Integer, nullable=False)  # 1 (very low) .. 5 (very good)
    stress = Column(Integer, nullable=False)  # 1 (none) .. 5 (extreme)
    sleep = Column(Integer, nullable=False)  # 1 (very poor) .. 5 (very good)
    note_text = Column(Text, nullable=True)

    score = Column(Integer, nullable=False)  # 0 (needs urgent support) .. 100 (doing well)
    zone = Column(String, nullable=False)
    self_report_score = Column(Integer, nullable=False)
    language_flags = Column(Text, nullable=True)  # JSON list of detected cue categories
    crisis_language = Column(Boolean, default=False, nullable=False)

    # Voice features (raw audio is never stored)
    voice_duration_s = Column(Float, nullable=True)
    voice_pitch_hz = Column(Float, nullable=True)
    voice_energy_db = Column(Float, nullable=True)
    voice_pause_ratio = Column(Float, nullable=True)
    voice_deviation = Column(Float, nullable=True)


class StudentCase(Base):
    """Counselor-side state for a student."""
    __tablename__ = 'student_cases'

    student_id = Column(String, ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    escalated = Column(Boolean, default=False, nullable=False)
    escalation_reason = Column(Text, nullable=True)
    last_contacted_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=utcnow, nullable=False)


class CaseNote(Base):
    __tablename__ = 'case_notes'

    id = Column(String, primary_key=True, default=new_id)
    student_id = Column(String, ForeignKey('users.id', ondelete='CASCADE'), index=True, nullable=False)
    author_id = Column(String, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    action_type = Column(String, nullable=False)  # note | contact | escalate | resolve
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utcnow, index=True, nullable=False)

    author = relationship('User', foreign_keys=[author_id])


class Alert(Base):
    __tablename__ = 'alerts'

    id = Column(String, primary_key=True, default=new_id)
    student_id = Column(String, ForeignKey('users.id', ondelete='CASCADE'), index=True, nullable=True)
    conversation_id = Column(String, ForeignKey('conversations.id', ondelete='SET NULL'), nullable=True)
    type = Column(String, nullable=False)  # zone_shift | crisis_language | crisis_button | chat_flag | escalation
    severity = Column(String, nullable=False)  # critical | high | medium
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(String, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at = Column(DateTime, default=utcnow, index=True, nullable=False)


class Conversation(Base):
    __tablename__ = 'conversations'

    id = Column(String, primary_key=True, default=new_id)
    student_id = Column(String, ForeignKey('users.id', ondelete='CASCADE'), index=True, nullable=False)
    alias = Column(String, nullable=False)  # what mentors see instead of the student
    topic = Column(String, nullable=True)
    status = Column(String, default='open', nullable=False)  # open | escalated | closed
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, index=True, nullable=False)


class Message(Base):
    __tablename__ = 'messages'

    id = Column(String, primary_key=True, default=new_id)
    conversation_id = Column(String, ForeignKey('conversations.id', ondelete='CASCADE'), index=True, nullable=False)
    sender_id = Column(String, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    sender_role = Column(String, nullable=False)  # student | peer-mentor | counselor | system
    body = Column(Text, nullable=False)
    flagged = Column(Boolean, default=False, nullable=False)
    flag_reason = Column(String, nullable=True)
    created_at = Column(DateTime, default=utcnow, index=True, nullable=False)


class Setting(Base):
    __tablename__ = 'settings'

    key = Column(String, primary_key=True)
    value = Column(Text, nullable=False)


class AuditLog(Base):
    __tablename__ = 'audit_logs'

    id = Column(String, primary_key=True, default=new_id)
    actor_id = Column(String, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    action = Column(String, nullable=False)
    target_id = Column(String, nullable=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow, index=True, nullable=False)

    actor = relationship('User', foreign_keys=[actor_id])
