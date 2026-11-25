import secrets
import string
import threading
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import InvalidTokenError
from sqlalchemy.orm import Session

from backend.config import settings
from backend.database import get_db
from backend.models import User

security = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------- passwords

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8')[:72], bcrypt.gensalt()).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8')[:72], hashed_password.encode('utf-8'))
    except ValueError:
        return False


def generate_temp_password(length: int = 12) -> str:
    alphabet = string.ascii_letters + string.digits
    # Avoid look-alike characters so temporary passwords are easy to read out or print.
    alphabet = ''.join(ch for ch in alphabet if ch not in 'Il1O0o')
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def validate_new_password(password: str) -> None:
    if len(password) < 8:
        raise HTTPException(status_code=400, detail='Password must be at least 8 characters long.')
    if password.isdigit() or password.isalpha():
        raise HTTPException(status_code=400, detail='Password must contain both letters and numbers.')


# ---------------------------------------------------------------- tokens

def create_access_token(user: User) -> str:
    expires = datetime.now(timezone.utc) + timedelta(hours=settings.token_hours)
    payload = {'sub': user.id, 'role': user.role, 'ver': user.token_version, 'exp': expires}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def _unauthorized(detail: str = 'Not authenticated') -> HTTPException:
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    if creds is None:
        raise _unauthorized()
    try:
        payload = jwt.decode(creds.credentials, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except InvalidTokenError as exc:
        raise _unauthorized('Session expired. Please sign in again.') from exc

    user = db.get(User, payload.get('sub'))
    if user is None or not user.is_active or payload.get('ver') != user.token_version:
        raise _unauthorized('Session expired. Please sign in again.')
    return user


def require_roles(*roles: str):
    def dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='You do not have access to this area.')
        return user
    return dependency


def require_ready_user(user: User = Depends(get_current_user)) -> User:
    """Blocks everything except changing password until a temporary password is replaced."""
    if user.must_change_password:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Please change your temporary password first.')
    return user


# ---------------------------------------------------------------- login throttling

class LoginRateLimiter:
    def __init__(self, max_attempts: int = 8, window_seconds: int = 15 * 60):
        self.max_attempts = max_attempts
        self.window = window_seconds
        self._failures: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def _key(self, request: Request, email: str) -> str:
        client = request.client.host if request.client else 'unknown'
        return f'{client}|{email.lower()}'

    def check(self, request: Request, email: str) -> None:
        key = self._key(request, email)
        now = time.monotonic()
        with self._lock:
            attempts = self._failures[key]
            while attempts and now - attempts[0] > self.window:
                attempts.popleft()
            if len(attempts) >= self.max_attempts:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail='Too many failed sign-in attempts. Please wait 15 minutes and try again.',
                )

    def record_failure(self, request: Request, email: str) -> None:
        with self._lock:
            self._failures[self._key(request, email)].append(time.monotonic())

    def reset(self, request: Request, email: str) -> None:
        with self._lock:
            self._failures.pop(self._key(request, email), None)


login_limiter = LoginRateLimiter()
# Generous because a whole class may sign up from one school network address.
signup_limiter = LoginRateLimiter(max_attempts=40, window_seconds=60 * 60)
guest_limiter = LoginRateLimiter(max_attempts=30, window_seconds=10 * 60)
