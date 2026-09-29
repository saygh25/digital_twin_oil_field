from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parent.parent.parent.parent
MODELS_DIR = ROOT_DIR / "models"
DATA_DIR = ROOT_DIR / "data"
DB_FILE = ROOT_DIR / "baghewala_twin.db"


class Settings(BaseSettings):
    environment: str = "development"
    database_url: str = f"sqlite:///{DB_FILE.as_posix()}"
    postgres_user: Optional[str] = "twin_admin"
    postgres_password: Optional[str] = "changeme"
    postgres_db: Optional[str] = "baghewala_twin"
    secret_key: str = "changeme-secret-key-baghewala"
    access_token_expire_minutes: int = 60
    log_level: str = "INFO"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
