from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Student

router = APIRouter()


@router.get('/{student_id}')
def get_student(student_id: str, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail='Student not found')
    return {
        'student_id': student.id,
        'name': student.name,
        'email': student.email,
        'department': student.department,
        'semester': student.semester,
        'consent_given': student.consent_given,
        'consent_version': student.consent_version,
    }
