from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
import jwt
from jwt import InvalidTokenError

from backend.config import settings

security = HTTPBearer()
pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')


def create_access_token(subject: str) -> str:
    expires = datetime.utcnow() + timedelta(hours=12)
    payload = {'sub': subject, 'exp': expires}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def verify_token(token: str) -> str:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        subject = payload.get('sub')
        if not subject:
            raise ValueError('Invalid token')
        return subject
    except InvalidTokenError as exc:
        raise ValueError('Invalid token') from exc


def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)) -> str:
    try:
        return verify_token(creds.credentials)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid credentials') from exc


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)
