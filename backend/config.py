from pydantic_settings import BaseSettings, SettingsConfigDict

DEV_JWT_SECRET = 'dev-secret-change-me'


class Settings(BaseSettings):
    app_name: str = 'ExamStress'
    environment: str = 'development'  # set ENVIRONMENT=production when deployed

    database_url: str = 'sqlite:///./examstress.db'
    jwt_secret: str = DEV_JWT_SECRET
    jwt_algorithm: str = 'HS256'
    token_hours: int = 12

    # Comma-separated list of allowed browser origins. Empty = same-origin only.
    cors_origins: str = 'http://localhost:5173,http://127.0.0.1:5173'

    # First administrator, created on startup if no admin exists yet.
    admin_email: str | None = None
    admin_password: str | None = None
    admin_name: str = 'School Administrator'

    # Optional e-mail alerts to counselors (crisis / high-risk alerts).
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from: str | None = None
    smtp_use_tls: bool = True

    max_audio_size_mb: int = 10
    max_audio_seconds: int = 90

    # Folder holding the built frontend (npm run build). Served by the API when present.
    frontend_dist: str = 'dist'

    model_config = SettingsConfigDict(env_file='.env', extra='ignore')

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == 'production'

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(',') if origin.strip()]

    @property
    def smtp_configured(self) -> bool:
        return bool(self.smtp_host and self.smtp_from)


settings = Settings()


def validate_production_settings() -> None:
    if not settings.is_production:
        return
    if settings.jwt_secret == DEV_JWT_SECRET or len(settings.jwt_secret) < 32:
        raise RuntimeError('JWT_SECRET must be set to a random value of at least 32 characters in production.')
