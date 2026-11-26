import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.auth import require_ready_user, require_roles
from backend.common import iso
from backend.database import get_db
from backend.models import Conversation, Message, User, VoiceNote, utcnow
from backend.services import audit, language
from backend.services.app_settings import get_settings
from backend.services.notify import create_alert
from backend.services.voice import VoiceAnalysisError, _read_wav

router = APIRouter(dependencies=[Depends(require_ready_user)])
chat_user = require_roles('student', 'peer-mentor', 'counselor')
responder = require_roles('peer-mentor', 'counselor')

MAX_MESSAGE_LENGTH = 1500
MAX_VOICE_NOTE_SECONDS = 60
MAX_VOICE_NOTE_BYTES = 3 * 1024 * 1024
ADJECTIVES = ['Blue', 'Calm', 'Bright', 'Gentle', 'Quiet', 'Brave', 'Kind', 'Steady', 'Sunny', 'Silver', 'Green', 'Golden']
ANIMALS = ['Owl', 'Panda', 'Otter', 'Falcon', 'Dolphin', 'Fox', 'Koala', 'Robin', 'Tiger', 'Heron', 'Deer', 'Sparrow']


class StartRequest(BaseModel):
    message: str
    topic: str | None = None


class MessageRequest(BaseModel):
    body: str


class EscalateRequest(BaseModel):
    reason: str


def _alias() -> str:
    return f'{secrets.choice(ADJECTIVES)} {secrets.choice(ANIMALS)} {secrets.randbelow(90) + 10}'


def _get_conversation(db: Session, conv_id: str, user: User) -> Conversation:
    conv = db.get(Conversation, conv_id)
    if not conv or (user.role == 'student' and conv.student_id != user.id):
        raise HTTPException(status_code=404, detail='Conversation not found.')
    return conv


def _sender_label(msg: Message, viewer: User, conv: Conversation, names: dict[str, str]) -> str:
    if msg.sender_role == 'system':
        return 'ExamStress Safety'
    if msg.sender_role == 'student':
        return 'You' if viewer.role == 'student' else conv.alias
    if msg.sender_id == viewer.id:
        return 'You'
    if msg.sender_role == 'counselor':
        return f'School Counselor ({names.get(msg.sender_id, "staff")})'
    return 'Peer Mentor'


def _serialise_conv(conv: Conversation, viewer: User, last: Message | None, anon: str | None) -> dict:
    return {
        'id': conv.id,
        'alias': conv.alias,
        'topic': conv.topic,
        'status': conv.status,
        'created_at': iso(conv.created_at),
        'updated_at': iso(conv.updated_at),
        'last_message': (last.body[:120] if last else None),
        'last_sender_role': last.sender_role if last else None,
        # Only counselors can link a chat back to the student's dashboard record.
        'student_anon_id': anon if viewer.role == 'counselor' else None,
        'student_id': conv.student_id if viewer.role == 'counselor' else None,
    }


def _post_system(db: Session, conv: Conversation, text: str) -> None:
    db.add(Message(conversation_id=conv.id, sender_role='system', body=text))


def _store_message(db: Session, background: BackgroundTasks, conv: Conversation, sender: User, body: str) -> Message:
    body = body.strip()
    if not body:
        raise HTTPException(status_code=400, detail='Message cannot be empty.')
    if len(body) > MAX_MESSAGE_LENGTH:
        raise HTTPException(status_code=400, detail=f'Messages are limited to {MAX_MESSAGE_LENGTH} characters.')
    if conv.status == 'closed':
        raise HTTPException(status_code=400, detail='This conversation has been closed. Please start a new one.')

    body, redacted = language.redact_contact_details(body)
    crisis = sender.role == 'student' and language.detect_crisis(body)
    msg = Message(
        conversation_id=conv.id, sender_id=sender.id, sender_role=sender.role, body=body,
        flagged=crisis, flag_reason='crisis_language' if crisis else ('contact_details' if redacted else None),
    )
    db.add(msg)
    conv.updated_at = utcnow()

    if redacted:
        _post_system(db, conv, 'Contact details were removed to keep this chat anonymous and safe.')
    if crisis:
        student = db.get(User, conv.student_id)
        helpline = get_settings(db)['helpline_text']
        conv.status = 'escalated'
        _post_system(db, conv, f'It sounds like you may be going through something really hard. A school counselor has been alerted '
                               f'and can see this conversation. If you are in danger right now: {helpline}')
        create_alert(db, background, type='chat_flag', severity='critical', student=student, conversation_id=conv.id,
                     message=f'Possible self-harm or suicide language from student {student.anon_id} in peer support chat "{conv.alias}".')
    return msg


@router.get('/conversations')
def list_conversations(db: Session = Depends(get_db), user: User = Depends(chat_user)):
    query = db.query(Conversation)
    if user.role == 'student':
        query = query.filter(Conversation.student_id == user.id)
    elif user.role == 'peer-mentor':
        recent = utcnow() - timedelta(days=14)
        query = query.filter((Conversation.status != 'closed') | (Conversation.updated_at >= recent))
    convs = query.order_by(Conversation.updated_at.desc()).limit(200).all()

    result = []
    anon_ids = dict(db.query(User.id, User.anon_id).filter(User.id.in_({c.student_id for c in convs})).all()) if convs else {}
    for conv in convs:
        last = db.query(Message).filter(Message.conversation_id == conv.id).order_by(Message.created_at.desc()).first()
        result.append(_serialise_conv(conv, user, last, anon_ids.get(conv.student_id)))
    return result


@router.post('/conversations', status_code=201)
def start_conversation(payload: StartRequest, background: BackgroundTasks, db: Session = Depends(get_db), user: User = Depends(require_roles('student'))):
    open_count = db.query(Conversation).filter(Conversation.student_id == user.id, Conversation.status != 'closed').count()
    if open_count >= 3:
        raise HTTPException(status_code=400, detail='You already have 3 open conversations. Please continue one of them or close one first.')
    conv = Conversation(student_id=user.id, alias=_alias(), topic=(payload.topic or '').strip()[:80] or None)
    db.add(conv)
    db.flush()
    _post_system(db, conv, 'You are anonymous here: peer mentors only see the name above, never your real name. '
                           'Mentors are trained students, not professionals. If you are in danger, press "I need help now".')
    _store_message(db, background, conv, user, payload.message)
    db.commit()
    return _serialise_conv(conv, user, None, user.anon_id)


@router.get('/conversations/{conv_id}/messages')
def get_messages(conv_id: str, after: str | None = None, db: Session = Depends(get_db), user: User = Depends(chat_user)):
    conv = _get_conversation(db, conv_id, user)
    query = db.query(Message).filter(Message.conversation_id == conv.id)
    if after:
        try:
            query = query.filter(Message.created_at > datetime.fromisoformat(after.rstrip('Z')))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail='Invalid "after" timestamp.') from exc
    messages = query.order_by(Message.created_at).limit(500).all()
    voice = dict(
        db.query(VoiceNote.message_id, VoiceNote.duration_s).filter(VoiceNote.message_id.in_([m.id for m in messages])).all()
    ) if messages else {}
    staff_ids = {m.sender_id for m in messages if m.sender_role == 'counselor' and m.sender_id}
    names = dict(db.query(User.id, User.name).filter(User.id.in_(staff_ids)).all()) if staff_ids else {}
    return {
        'conversation': _serialise_conv(conv, user, None, None),
        'messages': [{
            'id': m.id,
            'sender_role': m.sender_role,
            'sender_label': _sender_label(m, user, conv, names),
            'is_mine': m.sender_id == user.id,
            'body': m.body,
            'flagged': m.flagged if user.role != 'student' else False,
            'flag_reason': m.flag_reason if user.role != 'student' else None,
            'voice_seconds': voice.get(m.id),
            'created_at': iso(m.created_at),
        } for m in messages],
        'moderation': {
            'flagged': sum(1 for m in messages if m.flagged),
            'redacted': sum(1 for m in messages if m.flag_reason == 'contact_details'),
        },
    }


@router.post('/conversations/{conv_id}/messages', status_code=201)
def send_message(conv_id: str, payload: MessageRequest, background: BackgroundTasks, db: Session = Depends(get_db), user: User = Depends(chat_user)):
    conv = _get_conversation(db, conv_id, user)
    _store_message(db, background, conv, user, payload.body)
    db.commit()
    return {'message': 'Sent.'}


@router.post('/conversations/{conv_id}/voice', status_code=201)
async def send_voice_note(conv_id: str, audio: UploadFile = File(...), db: Session = Depends(get_db), user: User = Depends(chat_user)):
    conv = _get_conversation(db, conv_id, user)
    if conv.status == 'closed':
        raise HTTPException(status_code=400, detail='This conversation has been closed. Please start a new one.')
    data = await audio.read()
    if len(data) > MAX_VOICE_NOTE_BYTES:
        raise HTTPException(status_code=413, detail=f'Voice notes are limited to {MAX_VOICE_NOTE_SECONDS} seconds.')
    try:
        samples, rate = _read_wav(data)
    except VoiceAnalysisError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    seconds = len(samples) / rate
    if seconds < 0.5:
        raise HTTPException(status_code=400, detail='That voice note is too short.')
    if seconds > MAX_VOICE_NOTE_SECONDS + 1:
        raise HTTPException(status_code=413, detail=f'Voice notes are limited to {MAX_VOICE_NOTE_SECONDS} seconds.')
    whole = int(round(seconds))
    msg = Message(conversation_id=conv.id, sender_id=user.id, sender_role=user.role, body=f'[Voice note {whole // 60}:{whole % 60:02d}]')
    db.add(msg)
    db.flush()
    db.add(VoiceNote(message_id=msg.id, data=data, duration_s=round(seconds, 1)))
    conv.updated_at = utcnow()
    db.commit()
    return {'message': 'Sent.', 'id': msg.id}


@router.get('/messages/{message_id}/voice')
def get_voice_note(message_id: str, db: Session = Depends(get_db), user: User = Depends(chat_user)):
    msg = db.get(Message, message_id)
    if not msg:
        raise HTTPException(status_code=404, detail='Voice note not found.')
    _get_conversation(db, msg.conversation_id, user)  # same access rules as the conversation
    note = db.get(VoiceNote, message_id)
    if not note:
        raise HTTPException(status_code=404, detail='Voice note not found.')
    return Response(content=note.data, media_type='audio/wav', headers={'Cache-Control': 'private, no-store'})


@router.post('/conversations/{conv_id}/crisis')
def crisis_button(conv_id: str, background: BackgroundTasks, db: Session = Depends(get_db), user: User = Depends(require_roles('student'))):
    conv = _get_conversation(db, conv_id, user)
    return _raise_crisis(db, background, user, conv)


@router.post('/crisis')
def crisis_without_conversation(background: BackgroundTasks, db: Session = Depends(get_db), user: User = Depends(require_roles('student'))):
    return _raise_crisis(db, background, user, None)


def _raise_crisis(db: Session, background: BackgroundTasks, user: User, conv: Conversation | None) -> dict:
    helpline = get_settings(db)['helpline_text']
    where = f'from peer support chat "{conv.alias}"' if conv else 'from their wellbeing page'
    create_alert(db, background, type='crisis_button', severity='critical', student=user,
                 conversation_id=conv.id if conv else None,
                 message=f'Student {user.anon_id} pressed "I need help now" {where}. Please contact them as soon as possible.')
    if conv:
        conv.status = 'escalated'
        conv.updated_at = utcnow()
        _post_system(db, conv, f'Help request sent. A school counselor has been alerted. If you are in danger right now: {helpline}')
    audit.record(db, user, 'crisis_button', user.id, {'conversation_id': conv.id if conv else None})
    db.commit()
    return {'message': 'A school counselor has been alerted.', 'helpline_text': helpline}


@router.post('/conversations/{conv_id}/escalate')
def escalate(conv_id: str, payload: EscalateRequest, background: BackgroundTasks, db: Session = Depends(get_db), user: User = Depends(responder)):
    conv = _get_conversation(db, conv_id, user)
    reason = payload.reason.strip()
    if not reason:
        raise HTTPException(status_code=400, detail='Please say briefly why a counselor should look at this chat.')
    student = db.get(User, conv.student_id)
    conv.status = 'escalated'
    conv.updated_at = utcnow()
    _post_system(db, conv, 'A peer mentor has asked a school counselor to join this conversation.')
    create_alert(db, background, type='chat_flag', severity='high', student=student, conversation_id=conv.id,
                 message=f'Peer mentor requested counselor support for chat "{conv.alias}" (student {student.anon_id}): {reason}')
    db.commit()
    return {'message': 'A counselor has been alerted.'}


@router.post('/conversations/{conv_id}/close')
def close(conv_id: str, db: Session = Depends(get_db), user: User = Depends(chat_user)):
    conv = _get_conversation(db, conv_id, user)
    if conv.status == 'escalated' and user.role != 'counselor':
        raise HTTPException(status_code=400, detail='A counselor needs to review this conversation before it can be closed.')
    conv.status = 'closed'
    conv.updated_at = utcnow()
    _post_system(db, conv, 'This conversation was closed. You can always start a new one.')
    db.commit()
    return {'message': 'Conversation closed.'}
