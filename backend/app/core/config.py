"""
Me-Agent Configuration
Loads environment variables and provides app-wide settings.
"""
import os
from pydantic_settings import BaseSettings
from typing import Optional
from functools import lru_cache


class Settings(BaseSettings):
    # App settings
    APP_NAME: str = "Me-Agent"
    DEBUG: bool = True
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    
    # MongoDB
    MONGODB_URI: Optional[str] = None
    MONGODB_DB_NAME: str = "meagent"
    
    # ElevenLabs Voice API
    ELEVENLABS_API_KEY: Optional[str] = None
    ELEVENLABS_VOICE_ID: str = "21m00Tcm4TlvDq8ikWAM"  # Default: Rachel
    
    # Google Gemini API (for avatar generation)
    GOOGLE_GENERATIVE_AI_API_KEY: Optional[str] = None
    
    # WebAuthn settings
    WEBAUTHN_RP_ID: str = "localhost"
    WEBAUTHN_RP_NAME: str = "Me-Agent Demo"
    WEBAUTHN_ORIGIN: str = "http://localhost:8080"
    
    # Demo mode (use simulated passkey if WebAuthn not fully supported)
    DEMO_MODE: bool = True
    
    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:8080", "http://127.0.0.1:8080"]
    
    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
