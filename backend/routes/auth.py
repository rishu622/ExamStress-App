from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.auth import create_access_token, hash_password, verify_password
from backend.database import get_db
from backend.models import Student

router = APIRouter()


class LoginRequest(BaseModel):
    email: str
    password: str


class StudentRegisterRequest(BaseModel):
    student_id: str
    name: str
    email: str
    password: str
    department: str | None = None
    semester: str | None = None


@router.post('/register')
def register_student(payload: StudentRegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(Student).filter(Student.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=409, detail='Student already exists')

    student = Student(
        id=payload.student_id,
        name=payload.name,
        email=payload.email,
        department=payload.department,
        semester=payload.semester,
        consent_given=False,
        role='student',
    )
    db.add(student)
    db.commit()
    db.refresh(student)

    return {'message': 'Student registered', 'student_id': student.id}


@router.post('/login')
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.email == payload.email).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid credentials')

    if student.id != payload.email.split('@')[0]:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid credentials')

    token = create_access_token(student.id)
    return {'token': token, 'role': student.role, 'student_id': student.id}
