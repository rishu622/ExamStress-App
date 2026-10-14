from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = 'VoiceSense AI'
    database_url: str = 'sqlite:///./voicesense.db'
    jwt_secret: str = 'dev-secret-change-me'
    jwt_algorithm: str = 'HS256'
    retention_days: int = 30
    max_audio_size_mb: int = 20
    consent_version: str = 'v1'
    allowed_audio_types: tuple[str, ...] = ('.wav', '.mp3', '.m4a')
    whisper_model_size: str = 'tiny'
    whisper_device: str = 'cpu'
    whisper_compute_type: str = 'int8'

    model_config = SettingsConfigDict(env_file='.env', extra='ignore')


settings = Settings()
