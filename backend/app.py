import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

import backend.models  # noqa: F401  (registers tables)
from backend.auth import hash_password
from backend.common import user_public
from backend.config import settings, validate_production_settings
from backend.database import Base, SessionLocal, engine, upgrade_schema
from backend.models import User
from backend.routes import admin, alerts, auth, chat, guest, me, students, users, voice
from backend.services.retention import purge_expired

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(name)s: %(message)s')
logger = logging.getLogger('examstress')


def bootstrap_admin() -> None:
    """Creates the first administrator from ADMIN_EMAIL / ADMIN_PASSWORD if there is no admin yet."""
    with SessionLocal() as db:
        if db.query(User).filter(User.role == 'admin').first():
            return
        if not (settings.admin_email and settings.admin_password):
            logger.warning('No administrator exists. Set ADMIN_EMAIL and ADMIN_PASSWORD, or run: python -m backend.manage create-admin')
            return
        admin_user = User(
            email=settings.admin_email.strip().lower(), name=settings.admin_name, role='admin',
            password_hash=hash_password(settings.admin_password), must_change_password=False,
        )
        db.add(admin_user)
        db.commit()
        logger.info('Created initial administrator %s', user_public(admin_user)['email'])


async def retention_loop() -> None:
    while True:
        try:
            with SessionLocal() as db:
                purge_expired(db)
        except Exception:  # noqa: BLE001
            logger.exception('Retention purge failed')
        await asyncio.sleep(24 * 60 * 60)


@asynccontextmanager
async def lifespan(_: FastAPI):
    validate_production_settings()
    Base.metadata.create_all(bind=engine)
    upgrade_schema()
    bootstrap_admin()
    task = asyncio.create_task(retention_loop())
    yield
    task.cancel()


app = FastAPI(
    title='ExamStress API',
    version='1.0.0',
    lifespan=lifespan,
    docs_url=None if settings.is_production else '/docs',
    redoc_url=None,
    openapi_url=None if settings.is_production else '/openapi.json',
)

if settings.cors_origin_list:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=False,
        allow_methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        allow_headers=['Authorization', 'Content-Type'],
    )


@app.middleware('http')
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault('X-Content-Type-Options', 'nosniff')
    response.headers.setdefault('X-Frame-Options', 'DENY')
    response.headers.setdefault('Referrer-Policy', 'no-referrer')
    response.headers.setdefault('Permissions-Policy', 'microphone=(self), camera=(), geolocation=()')
    if request.url.path.startswith('/api/'):
        response.headers.setdefault('Cache-Control', 'no-store')
    if settings.is_production:
        response.headers.setdefault('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    return response


app.include_router(auth.router, prefix='/api/auth', tags=['auth'])
app.include_router(me.router, prefix='/api/me', tags=['student'])
app.include_router(users.router, prefix='/api/users', tags=['users'])
app.include_router(students.router, prefix='/api/students', tags=['students'])
app.include_router(alerts.router, prefix='/api/alerts', tags=['alerts'])
app.include_router(chat.router, prefix='/api/chat', tags=['chat'])
app.include_router(guest.router, prefix='/api/guest', tags=['guest'])
app.include_router(voice.router, prefix='/api/voice', tags=['voice'])
app.include_router(admin.router, prefix='/api', tags=['admin'])


@app.get('/health')
@app.get('/api/health')
def health_check():
    return {'status': 'ok', 'service': 'examstress'}


# ---------------------------------------------------------------- frontend (single-page app)

DIST_DIR = os.path.abspath(settings.frontend_dist)


@app.get('/{full_path:path}', include_in_schema=False)
def serve_frontend(full_path: str):
    if full_path.startswith('api/'):
        return JSONResponse({'detail': 'Not found'}, status_code=404)
    index = os.path.join(DIST_DIR, 'index.html')
    if not os.path.isfile(index):
        return JSONResponse({'detail': 'Frontend not built. Run "npm run build" or use the Vite dev server.'}, status_code=404)
    candidate = os.path.abspath(os.path.join(DIST_DIR, full_path))
    if full_path and candidate.startswith(DIST_DIR + os.sep) and os.path.isfile(candidate):
        headers = {'Cache-Control': 'public, max-age=31536000, immutable'} if '/assets/' in candidate.replace(os.sep, '/') else {}
        return FileResponse(candidate, headers=headers)
    return FileResponse(index, headers={'Cache-Control': 'no-cache'})
