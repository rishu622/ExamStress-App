from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.auth import (
    create_access_token, get_current_user, hash_password, login_limiter, validate_new_password, verify_password,
)
from backend.common import user_public
from backend.database import get_db
from backend.models import User, utcnow
from backend.services import audit

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
