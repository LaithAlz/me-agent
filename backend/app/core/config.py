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
    # - `.env` is useful locally
    # - In production (Render), env vars come from the platform, not a file
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # App settings
    APP_NAME: str = "Me-Agent"
    DEBUG: bool = False
    SECRET_KEY: str = "dev-secret-key-change-in-production"

    # Currency
    DEFAULT_CURRENCY: str = "CAD"

    # Backboard
    BACKBOARD_API_KEY: Optional[str] = None

    # MongoDB (your code uses MONGO_URI)
    MONGO_URI: Optional[str] = None
    MONGO_DB_NAME: str = "meagent"  # use this name consistently everywhere

    # ElevenLabs Voice API
    ELEVENLABS_API_KEY: Optional[str] = None
    ELEVENLABS_VOICE_ID: str = "21m00Tcm4TlvDq8ikWAM"

    # Google Gemini API (for avatar generation)
    GOOGLE_GENERATIVE_AI_API_KEY: Optional[str] = None

    # WebAuthn settings
    WEBAUTHN_RP_ID: str = "me-agent.tech"
    WEBAUTHN_ORIGIN: str = "https://me-agent.tech"
    WEBAUTHN_RP_NAME: str = "Me-Agent Demo"

    # Demo mode
    DEMO_MODE: bool = True

    # CORS
    # Add your deployed frontend domains here
    CORS_ORIGINS: list[str] = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:8080",
  "http://127.0.0.1:8080",

  # your custom domain
  "https://me-agent.tech",
  "https://www.me-agent.tech",

  # your current Vercel preview domain (the one in the error)
  "https://me-agent-git-main-laithalzs-projects.vercel.app",

  # strongly recommended for future preview URLs
  "https://me-agent.vercel.app",
   ]



@lru_cache()
def get_settings() -> Settings:
    # No debug prints here. Render will not read `.env` unless you bake it into the image
    # Use Render Environment Variables for production secrets and URLs
    return Settings()
