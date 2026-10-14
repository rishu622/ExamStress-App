import os
from datetime import datetime, timedelta
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.auth import get_current_user, verify_token
from backend.config import settings
from backend.database import get_db
from backend.models import Student, VoiceAnalysis, VoiceFeatures, VoiceRecording
from backend.services.audio_service import analyze_transcript_text, build_voice_assessment, extract_acoustic_features, transcribe_audio_file, validate_audio

router = APIRouter()


class ConsentRequest(BaseModel):
    student_id: str
    consent_version: str


def _sanitize_email_local_part(student_id: str) -> str:
    cleaned = ''.join(character.lower() if character.isalnum() else '-' for character in student_id).strip('-')
    return cleaned or 'demo-student'


def _resolve_student_id(student_id: str, authorization: str | None) -> str:
    if authorization and authorization.startswith('Bearer '):
        token = authorization.split(' ', 1)[1].strip()
        try:
            token_student_id = verify_token(token)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid credentials') from exc
        if student_id and token_student_id != student_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Student can only upload their own recordings')
        return token_student_id
    return student_id


def _ensure_student_exists(db: Session, student_id: str) -> Student:
    student = db.query(Student).filter(Student.id == student_id).first()
    if student:
        return student

    student = Student(
        id=student_id,
        name=f'Demo {student_id}',
        email=f'{_sanitize_email_local_part(student_id)}@demo.local',
        role='student',
        consent_given=False,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


@router.post('/consent')
def save_consent(payload: ConsentRequest, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    if user_id != payload.student_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Student can only update their own consent status')

    student = db.query(__import__('backend.models', fromlist=['Student']).Student).filter_by(id=payload.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail='Student not found')

    student.consent_given = True
    student.consent_version = payload.consent_version
    student.consent_timestamp = datetime.utcnow()
    db.commit()
    return {'message': 'Consent recorded', 'version': payload.consent_version}


@router.post('/upload')
async def upload_voice(
    student_id: str = Form(...),
    transcript_text: str = Form(''),
    prompt_text: str = Form(''),
    file: UploadFile = File(...),
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    resolved_student_id = _resolve_student_id(student_id, authorization)
    _ensure_student_exists(db, resolved_student_id)

    if file.filename is None:
        raise HTTPException(status_code=400, detail='File name is required')

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in settings.allowed_audio_types:
        raise HTTPException(status_code=400, detail='Unsupported audio format')

    content = await file.read()
    if len(content) <= 0:
        raise HTTPException(status_code=400, detail='Empty audio file')
    if len(content) > settings.max_audio_size_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail='File too large')

    validation = validate_audio(len(content), file.filename, duration=None)
    if not validation['valid']:
        raise HTTPException(status_code=400, detail=validation['error'])

    storage_dir = os.path.join('backend', 'storage')
    os.makedirs(storage_dir, exist_ok=True)
    filename = f'{resolved_student_id}-{uuid4()}{ext}'
    storage_path = os.path.join(storage_dir, filename)

    with open(storage_path, 'wb') as handle:
        handle.write(content)

    transcript_hint = transcript_text.strip()
    prompt_text = prompt_text.strip()
    transcription_result = transcribe_audio_file(storage_path)
    transcribed_text = transcription_result.get('text', '').strip()
    if transcribed_text:
        transcript_text = transcribed_text
        transcription_status = 'completed'
    elif transcript_hint:
        transcript_text = transcript_hint
        transcription_status = 'fallback'
    else:
        transcript_text = prompt_text
        transcription_status = 'fallback'

    recording = VoiceRecording(
        id=str(uuid4()),
        student_id=resolved_student_id,
        filename=filename,
        file_path=storage_path,
        duration_seconds=30,
        status='uploaded',
        transcription_status=transcription_status,
        transcript_text=transcript_text,
        prompt_text=prompt_text,
        retention_expiry=datetime.utcnow() + timedelta(days=settings.retention_days),
    )
    db.add(recording)
    db.commit()
    db.refresh(recording)

    features = extract_acoustic_features(storage_path)
    semantic_result = analyze_transcript_text(transcript_text or prompt_text)
    fused_result = build_voice_assessment(features, semantic_result)
    feature_record = VoiceFeatures(
        id=str(uuid4()),
        recording_id=recording.id,
        student_id=resolved_student_id,
        pitch_mean=features['pitch_mean'],
        pitch_std=features['pitch_std'],
        speech_rate=features['speech_rate'],
        pause_duration=features['pause_duration'],
        pause_frequency=features['pause_frequency'],
        energy=features['energy'],
        jitter=features['jitter'],
        shimmer=features['shimmer'],
        hnr=features['hnr'],
        sentiment_score=semantic_result['sentiment_score'],
        response_length=semantic_result['response_length'],
        engagement_score=max(0.0, min(1.0, 1.0 - (semantic_result['semantic_score'] / 100))),
        semantic_score=semantic_result['semantic_score'],
    )
    db.add(feature_record)

    analysis = VoiceAnalysis(
        id=str(uuid4()),
        student_id=resolved_student_id,
        recording_id=recording.id,
        support_index=fused_result['support_index'],
        confidence=fused_result['confidence'],
        confidence_label=fused_result['confidence_label'],
        trend=fused_result['trend'],
        baseline_status='established',
        recommendation=fused_result['recommendation'],
        explanation='; '.join(fused_result['explanation']),
        feature_changes=fused_result['feature_changes'],
        linguistic_indicators=fused_result['linguistic_indicators'],
        overall_score=fused_result['overall_score'],
        risk_category=fused_result['risk_category'],
        semantic_score=semantic_result['semantic_score'],
        transcript_text=transcript_text,
        counselor_review_status='pending',
    )
    db.add(analysis)
    db.commit()

    return {
        'recording_id': recording.id,
        'analysis_id': analysis.id,
        'student_id': resolved_student_id,
        'support_index': fused_result['support_index'],
        'overall_score': fused_result['overall_score'],
        'semantic_score': semantic_result['semantic_score'],
        'risk_category': fused_result['risk_category'],
        'confidence': fused_result['confidence'],
        'confidence_label': fused_result['confidence_label'],
        'trend': fused_result['trend'],
        'baseline_status': 'established',
        'recommendation': fused_result['recommendation'],
        'transcript_text': transcript_text,
        'transcription_status': transcription_status,
        'transcription_language': transcription_result.get('language'),
        'transcription_confidence': transcription_result.get('confidence'),
        'prompt_text': prompt_text,
        'semantic_indicators': semantic_result['indicators'],
        'features': features,
    }


@router.get('/my-history')
def get_my_history(db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    rows = db.query(VoiceRecording).filter(VoiceRecording.student_id == user_id).order_by(VoiceRecording.created_at.desc()).all()
    return [{
        'recording_id': row.id,
        'filename': row.filename,
        'status': row.status,
        'created_at': row.created_at.isoformat(),
    } for row in rows]


@router.get('/my-latest-analysis')
def get_latest_analysis(db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    analysis = db.query(VoiceAnalysis).filter(VoiceAnalysis.student_id == user_id).order_by(VoiceAnalysis.created_at.desc()).first()
    if not analysis:
        return {'message': 'No analysis exists yet'}
    return {
        'analysis_id': analysis.id,
        'support_index': analysis.support_index,
        'overall_score': analysis.overall_score,
        'semantic_score': analysis.semantic_score,
        'risk_category': analysis.risk_category,
        'confidence': analysis.confidence,
        'confidence_label': analysis.confidence_label,
        'trend': analysis.trend,
        'baseline_status': analysis.baseline_status,
        'recommendation': analysis.recommendation,
        'transcript_text': analysis.transcript_text,
    }


@router.get('/counselor/students')
def get_voice_students(db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    # demo-only placeholder; a real system would enforce role-based counselor access
    analyses = db.query(VoiceAnalysis).order_by(VoiceAnalysis.created_at.desc()).all()
    return [{
        'student_id': analysis.student_id,
        'support_index': analysis.support_index,
        'confidence': analysis.confidence,
        'confidence_label': analysis.confidence_label,
        'trend': analysis.trend,
        'baseline_status': analysis.baseline_status,
    } for analysis in analyses]


@router.get('/counselor/student/{student_id}')
def get_student_voice_analysis(student_id: str, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    analysis = db.query(VoiceAnalysis).filter(VoiceAnalysis.student_id == student_id).order_by(VoiceAnalysis.created_at.desc()).first()
    if not analysis:
        raise HTTPException(status_code=404, detail='No voice analysis for this student')
    return {
        'student_id': student_id,
        'support_index': analysis.support_index,
        'overall_score': analysis.overall_score,
        'semantic_score': analysis.semantic_score,
        'risk_category': analysis.risk_category,
        'confidence': analysis.confidence,
        'confidence_label': analysis.confidence_label,
        'trend': analysis.trend,
        'baseline_status': analysis.baseline_status,
        'recommendation': analysis.recommendation,
        'explanation': analysis.explanation,
        'transcript_text': analysis.transcript_text,
    }


@router.patch('/analysis/{analysis_id}/review')
def review_analysis(analysis_id: str, payload: dict, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    analysis = db.query(VoiceAnalysis).filter(VoiceAnalysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail='Analysis not found')
    analysis.counselor_review_status = payload.get('status', 'pending')
    analysis.counselor_notes = payload.get('notes')
    db.commit()
    return {'message': 'Review updated', 'status': analysis.counselor_review_status}


@router.patch('/consent/withdraw')
def withdraw_consent(student_id: str, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    if user_id != student_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Student can only withdraw their own consent')

    student = db.query(__import__('backend.models', fromlist=['Student']).Student).filter_by(id=student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail='Student not found')
    student.consent_given = False
    db.commit()
    return {'message': 'Consent withdrawn'}
