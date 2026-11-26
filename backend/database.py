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


# Columns added after the first release. create_all() only creates missing tables, so existing
# databases get new nullable columns here.
ADDED_COLUMNS = {'users': {'alert_phone': 'VARCHAR'}}


def upgrade_schema() -> None:
    from sqlalchemy import inspect, text

    inspector = inspect(engine)
    with engine.begin() as conn:
        for table, columns in ADDED_COLUMNS.items():
            if not inspector.has_table(table):
                continue
            existing = {c['name'] for c in inspector.get_columns(table)}
            for name, sql_type in columns.items():
                if name not in existing:
                    conn.execute(text(f'ALTER TABLE {table} ADD COLUMN {name} {sql_type}'))
