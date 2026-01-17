"""
Me-Agent Voice Schemas
Defines voice synthesis request/response models.
"""
from pydantic import BaseModel, Field
from typing import Optional


class VoiceRequest(BaseModel):
    """Request to synthesize text to speech."""
    text: str = Field(..., min_length=1, max_length=5000, description="Text to speak")
    voiceId: Optional[str] = Field(None, description="ElevenLabs voice ID (uses default if not specified)")


class VoiceResponse(BaseModel):
    """Response with synthesized audio."""
    success: bool
    audioBase64: Optional[str] = Field(None, description="Base64-encoded audio data")
    contentType: str = Field(default="audio/mpeg", description="Audio MIME type")
    text: str = Field(..., description="The text that was spoken (or attempted)")
    mock: bool = Field(default=False, description="True if this is mock audio (API key not available)")
    error: Optional[str] = Field(None, description="Error message if synthesis failed")
