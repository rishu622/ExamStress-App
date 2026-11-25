import csv
import io
import re

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.auth import generate_temp_password, hash_password, require_ready_user, require_roles, validate_new_password
from backend.common import generate_anon_id, user_public
from backend.database import get_db
from backend.models import ROLES, User
from backend.services import audit

router = APIRouter(dependencies=[Depends(require_ready_user)])
admin_only = require_roles('admin')


class CreateUserRequest(BaseModel):
    name: str
    email: str
    role: str
    grade_class: str | None = None
    password: str | None = None  # optional; a temporary one is generated otherwise


class UpdateUserRequest(BaseModel):
    name: str | None = None
    role: str | None = None
    grade_class: str | None = None
    is_active: bool | None = None


EMAIL_RE = re.compile(r'^[^@\s,;<>"]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$')


def _clean_email(raw: str) -> str:
    email = raw.strip().lower()
    if len(email) > 254 or not EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail=f'Invalid e-mail address: {raw}')
    return email


def _check_role(role: str) -> None:
    if role not in ROLES:
        raise HTTPException(status_code=400, detail=f'Role must be one of: {", ".join(ROLES)}.')


def create_account(db: Session, name: str, email: str, role: str, grade_class: str | None, password: str | None) -> tuple[User, str | None]:
    name = name.strip()
    if not name:
        raise HTTPException(status_code=400, detail='Name is required.')
    _check_role(role)
    email = _clean_email(email)
    if db.query(User.id).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail=f'An account with {email} already exists.')

    temp_password = None
    if password:
        validate_new_password(password)
    else:
        temp_password = password = generate_temp_password()

    user = User(
        name=name,
        email=email,
        role=role,
        grade_class=(grade_class or '').strip() or None,
        password_hash=hash_password(password),
        anon_id=generate_anon_id(db) if role == 'student' else None,
        must_change_password=True,
    )
    db.add(user)
    db.flush()
    return user, temp_password


def _active_admin_count(db: Session) -> int:
    return db.query(User).filter(User.role == 'admin', User.is_active.is_(True)).count()


@router.get('')
def list_users(role: str | None = None, db: Session = Depends(get_db), _: User = Depends(admin_only)):
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    return [user_public(u) for u in query.order_by(User.role, User.name).all()]


@router.post('', status_code=201)
def create_user(payload: CreateUserRequest, db: Session = Depends(get_db), actor: User = Depends(admin_only)):
    user, temp_password = create_account(db, payload.name, payload.email, payload.role, payload.grade_class, payload.password)
    audit.record(db, actor, 'user_created', user.id, {'role': user.role, 'email': user.email})
    db.commit()
    return {'user': user_public(user), 'temporary_password': temp_password}


@router.post('/import', status_code=201)
async def import_users(file: UploadFile = File(...), db: Session = Depends(get_db), actor: User = Depends(admin_only)):
    """CSV columns: name, email, and optionally role (default student) and grade_class."""
    raw = await file.read()
    if len(raw) > 2 * 1024 * 1024:
        raise HTTPException(status_code=413, detail='CSV file is too large (max 2 MB).')
    try:
        text = raw.decode('utf-8-sig')
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=400, detail='CSV must be saved as UTF-8.') from exc

    reader = csv.DictReader(io.StringIO(text))
    headers = {h.strip().lower() for h in (reader.fieldnames or [])}
    if not {'name', 'email'} <= headers:
        raise HTTPException(status_code=400, detail='CSV needs at least "name" and "email" columns.')

    created, errors = [], []
    for line_no, row in enumerate(reader, start=2):
        row = {(k or '').strip().lower(): (v or '').strip() for k, v in row.items()}
        if not row.get('name') and not row.get('email'):
            continue
        try:
            with db.begin_nested():
                user, temp = create_account(db, row.get('name', ''), row.get('email', ''), row.get('role') or 'student',
                                     row.get('grade_class') or row.get('class'), None)
            created.append({'name': user.name, 'email': user.email, 'role': user.role,
                            'grade_class': user.grade_class, 'temporary_password': temp})
        except HTTPException as exc:
            errors.append({'line': line_no, 'error': exc.detail})

    audit.record(db, actor, 'users_imported', None, {'created': len(created), 'errors': len(errors)})
    db.commit()
    return {'created': created, 'errors': errors}


@router.patch('/{user_id}')
def update_user(user_id: str, payload: UpdateUserRequest, db: Session = Depends(get_db), actor: User = Depends(admin_only)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail='User not found.')

    removing_admin = user.role == 'admin' and user.is_active and (
        (payload.role and payload.role != 'admin') or payload.is_active is False
    )
    if removing_admin and _active_admin_count(db) <= 1:
        raise HTTPException(status_code=400, detail='You cannot remove the last active administrator.')

    changes = payload.model_dump(exclude_none=True)
    if 'name' in changes:
        if not changes['name'].strip():
            raise HTTPException(status_code=400, detail='Name is required.')
        user.name = changes['name'].strip()
    if 'grade_class' in changes:
        user.grade_class = changes['grade_class'].strip() or None
    if 'role' in changes:
        _check_role(changes['role'])
        user.role = changes['role']
        if user.role == 'student' and not user.anon_id:
            user.anon_id = generate_anon_id(db)
        user.token_version += 1
    if 'is_active' in changes:
        user.is_active = changes['is_active']
        if not user.is_active:
            user.token_version += 1

    audit.record(db, actor, 'user_updated', user.id, changes)
    db.commit()
    return user_public(user)


@router.post('/{user_id}/reset-password')
def reset_password(user_id: str, db: Session = Depends(get_db), actor: User = Depends(admin_only)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail='User not found.')
    temp = generate_temp_password()
    user.password_hash = hash_password(temp)
    user.must_change_password = True
    user.token_version += 1
    audit.record(db, actor, 'password_reset', user.id)
    db.commit()
    return {'temporary_password': temp}


@router.delete('/{user_id}')
def delete_user(user_id: str, db: Session = Depends(get_db), actor: User = Depends(admin_only)):
    """Permanently erases an account and all of its data (e.g. on a data-erasure request)."""
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail='User not found.')
    if user.id == actor.id:
        raise HTTPException(status_code=400, detail='You cannot delete your own account.')
    if user.role == 'admin' and user.is_active and _active_admin_count(db) <= 1:
        raise HTTPException(status_code=400, detail='You cannot delete the last active administrator.')

    audit.record(db, actor, 'user_deleted', user.id, {'role': user.role, 'anon_id': user.anon_id})
    db.delete(user)
    db.commit()
    return {'message': 'Account and associated data deleted.'}
