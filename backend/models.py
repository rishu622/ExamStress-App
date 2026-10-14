from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from backend.database import Base


class Student(Base):
    __tablename__ = 'students'

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    department = Column(String, nullable=True)
    semester = Column(String, nullable=True)
    role = Column(String, default='student')
    consent_given = Column(Boolean, default=False)
    consent_version = Column(String, nullable=True)
    consent_timestamp = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class VoiceRecording(Base):
    __tablename__ = 'voice_recordings'

    id = Column(String, primary_key=True, index=True)
    student_id = Column(String, ForeignKey('students.id'), nullable=False)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    duration_seconds = Column(Float, nullable=True)
    status = Column(String, default='uploaded')
    transcription_status = Column(String, default='pending')
    prompt_text = Column(Text, nullable=True)
    transcript_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    retention_expiry = Column(DateTime, nullable=True)

    student = relationship('Student')


class VoiceFeatures(Base):
    __tablename__ = 'voice_features'

    id = Column(String, primary_key=True, index=True)
    recording_id = Column(String, ForeignKey('voice_recordings.id'), nullable=False)
    student_id = Column(String, ForeignKey('students.id'), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    pitch_mean = Column(Float, nullable=True)
    pitch_std = Column(Float, nullable=True)
    speech_rate = Column(Float, nullable=True)
    pause_duration = Column(Float, nullable=True)
    pause_frequency = Column(Float, nullable=True)
    energy = Column(Float, nullable=True)
    jitter = Column(Float, nullable=True)
    shimmer = Column(Float, nullable=True)
    hnr = Column(Float, nullable=True)
    sentiment_score = Column(Float, nullable=True)
    response_length = Column(Integer, nullable=True)
    engagement_score = Column(Float, nullable=True)
    semantic_score = Column(Float, nullable=True)


class VoiceBaseline(Base):
    __tablename__ = 'voice_baselines'

    id = Column(String, primary_key=True, index=True)
    student_id = Column(String, ForeignKey('students.id'), nullable=False)
    baseline_period = Column(String, default='30d')
    pitch_mean = Column(Float, nullable=True)
    pitch_std = Column(Float, nullable=True)
    speech_rate_mean = Column(Float, nullable=True)
    pause_duration_mean = Column(Float, nullable=True)
    energy_mean = Column(Float, nullable=True)
    feature_variances = Column(Text, nullable=True)
    recordings_used = Column(Integer, default=0)
    baseline_status = Column(String, default='building')
    updated_at = Column(DateTime, default=datetime.utcnow)


class VoiceAnalysis(Base):
    __tablename__ = 'voice_analyses'

    id = Column(String, primary_key=True, index=True)
    student_id = Column(String, ForeignKey('students.id'), nullable=False)
    recording_id = Column(String, ForeignKey('voice_recordings.id'), nullable=False)
    support_index = Column(Integer, nullable=False)
    overall_score = Column(Integer, nullable=True)
    semantic_score = Column(Float, nullable=True)
    risk_category = Column(String, nullable=True)
    confidence = Column(Float, nullable=False)
    confidence_label = Column(String, nullable=False)
    trend = Column(String, nullable=False)
    baseline_status = Column(String, nullable=False)
    recommendation = Column(String, nullable=True)
    explanation = Column(Text, nullable=True)
    feature_changes = Column(Text, nullable=True)
    linguistic_indicators = Column(Text, nullable=True)
    transcript_text = Column(Text, nullable=True)
    counselor_review_status = Column(String, default='pending')
    counselor_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = 'audit_logs'

    id = Column(String, primary_key=True, index=True)
    student_id = Column(String, nullable=True)
    actor_role = Column(String, nullable=True)
    action = Column(String, nullable=False)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
