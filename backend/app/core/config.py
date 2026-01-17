"""
Me-Agent Configuration
Loads environment variables and provides app-wide settings.
"""
from __future__ import annotations

from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Pydantic v2 settings configuration
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # App settings
    APP_NAME: str = "Me-Agent"
    DEBUG: bool = True
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    BACKBOARD_API_KEY: Optional[str] = None

    # MongoDB
    MONGO_URI: Optional[str] = None
    MONGODB_DB_NAME: str = "meagent"

    # ElevenLabs Voice API
    ELEVENLABS_API_KEY: Optional[str] = None
    ELEVENLABS_VOICE_ID: str = "21m00Tcm4TlvDq8ikWAM"

    # Google Gemini API (for avatar generation)
    GOOGLE_GENERATIVE_AI_API_KEY: Optional[str] = None

    # WebAuthn settings
    WEBAUTHN_RP_ID: str = "localhost"
    WEBAUTHN_RP_NAME: str = "Me-Agent Demo"
    WEBAUTHN_ORIGIN: str = "http://localhost:8080"

    # Demo mode
    DEMO_MODE: bool = True

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:8080", "http://127.0.0.1:8080"]


@lru_cache()
def get_settings() -> Settings:
    import os
    print("CWD:", os.getcwd())
    print(".env exists in CWD?", os.path.exists(".env"))
    return Settings()
