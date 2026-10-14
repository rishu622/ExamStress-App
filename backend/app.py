from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.database import Base, engine
import backend.models  # noqa: F401
from backend.routes import voice, auth, students

app = FastAPI(title='VoiceSense AI Service', version='0.1.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(auth.router, prefix='/api/auth', tags=['auth'])
app.include_router(students.router, prefix='/api/students', tags=['students'])
app.include_router(voice.router, prefix='/api/voice', tags=['voice'])

Base.metadata.create_all(bind=engine)

@app.get('/health')
def health_check():
    return {'status': 'ok', 'service': 'voicesense-ai'}
