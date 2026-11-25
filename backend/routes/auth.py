import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.auth import (
    create_access_token, get_current_user, hash_password, login_limiter, signup_limiter, validate_new_password,
    verify_password,
)
from backend.common import user_public
from backend.database import get_db
from backend.models import User, utcnow
from backend.routes.users import create_account
from backend.services import audit
from backend.services.app_settings import get_settings, signup_domains

router = APIRouter()

# Used to keep response time similar whether or not the e-mail exists.
_DUMMY_HASH = hash_password('timing-equaliser-1')


class LoginRequest(BaseModel):
    email: str
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post('/login')
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    login_limiter.check(request, email)

    user = db.query(User).filter(User.email == email).first()
    valid = verify_password(payload.password, user.password_hash if user else _DUMMY_HASH)
    if not user or not valid:
        login_limiter.record_failure(request, email)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Incorrect e-mail or password.')
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='This account has been deactivated. Please contact your school administrator.')

    login_limiter.reset(request, email)
    user.last_login_at = utcnow()
    audit.record(db, user, 'login')
    db.commit()
    return {'token': create_access_token(user), 'user': user_public(user)}


class SignupRequest(BaseModel):
    name: str
    email: str
    password: str
    grade_class: str | None = None
    join_code: str | None = None


@router.get('/public-config')
def public_config(db: Session = Depends(get_db)):
    """Unauthenticated: what the sign-in screen and guest mode need to know."""
    values = get_settings(db)
    return {
        'school_name': values['school_name'],
        'helpline_text': values['helpline_text'],
        'counselor_contact_text': values['counselor_contact_text'],
        'signup_enabled': values['self_signup_enabled'],
        'signup_code_required': bool(values['signup_code'].strip()),
        'signup_email_domains': signup_domains(values),
        'guest_enabled': values['guest_access_enabled'],
    }


@router.post('/signup', status_code=201)
def signup(payload: SignupRequest, request: Request, db: Session = Depends(get_db)):
    values = get_settings(db)
    if not values['self_signup_enabled']:
        raise HTTPException(status_code=403, detail='Self sign-up is turned off. Please ask your school for an account.')
    signup_limiter.check(request, 'signup')
    signup_limiter.record_failure(request, 'signup')  # counts every attempt

    expected_code = values['signup_code'].strip()
    if expected_code and not secrets.compare_digest((payload.join_code or '').strip().lower(), expected_code.lower()):
        raise HTTPException(status_code=400, detail='That school join code is not correct. Ask your teacher or counselor for it.')

    domains = signup_domains(values)
    email_domain = payload.email.strip().lower().rsplit('@', 1)[-1]
    if domains and email_domain not in domains:
        raise HTTPException(status_code=400, detail=f'Please use your school e-mail address ({" or ".join("@" + d for d in domains)}).')

    user, _ = create_account(db, payload.name, payload.email, 'student', payload.grade_class, payload.password)
    user.must_change_password = False
    user.last_login_at = utcnow()
    audit.record(db, user, 'self_signup', user.id)
    db.commit()
    return {'token': create_access_token(user), 'user': user_public(user)}


@router.get('/me')
def me(user: User = Depends(get_current_user)):
    return user_public(user)


@router.post('/change-password')
def change_password(payload: ChangePasswordRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail='Your current password is incorrect.')
    if payload.new_password == payload.current_password:
        raise HTTPException(status_code=400, detail='Please choose a password different from the current one.')
    validate_new_password(payload.new_password)

    user.password_hash = hash_password(payload.new_password)
    user.must_change_password = False
    user.token_version += 1  # signs out other sessions
    audit.record(db, user, 'password_changed', user.id)
    db.commit()
    return {'token': create_access_token(user), 'user': user_public(user)}
