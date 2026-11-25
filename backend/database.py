from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker

from backend.config import settings


def _normalise_url(url: str) -> str:
    # Hosting providers often hand out postgres:// URLs; SQLAlchemy needs the driver named.
    if url.startswith('postgres://'):
        return 'postgresql+psycopg://' + url[len('postgres://'):]
    if url.startswith('postgresql://'):
        return 'postgresql+psycopg://' + url[len('postgresql://'):]
    return url


DATABASE_URL = _normalise_url(settings.database_url)
IS_SQLITE = DATABASE_URL.startswith('sqlite')

engine = create_engine(
    DATABASE_URL,
    connect_args={'check_same_thread': False} if IS_SQLITE else {},
    pool_pre_ping=not IS_SQLITE,
)

if IS_SQLITE:
    @event.listens_for(engine, 'connect')
    def _enable_sqlite_foreign_keys(dbapi_connection, _record):
        cursor = dbapi_connection.cursor()
        cursor.execute('PRAGMA foreign_keys=ON')
        cursor.execute('PRAGMA journal_mode=WAL')
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
