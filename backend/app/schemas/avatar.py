"""
Me-Agent Avatar Schemas
Defines avatar generation request/response models (Gemini-powered bitmoji).
"""
from pydantic import BaseModel, Field
from typing import Optional


class AvatarGenerateRequest(BaseModel):
    """Request to generate a bitmoji-style avatar from a photo."""
    imageBase64: str = Field(..., description="Base64-encoded user photo")
    style: str = Field(default="bitmoji", description="Avatar style (bitmoji, cartoon, anime)")


class AvatarGenerateResponse(BaseModel):
    """Response with generated avatar."""
    success: bool
    avatarBase64: Optional[str] = Field(None, description="Base64-encoded generated avatar")
    style: str
    error: Optional[str] = None


class AvatarGetResponse(BaseModel):
    """Response with user's current avatar."""
    hasAvatar: bool
    avatarBase64: Optional[str] = None
    style: Optional[str] = None
    createdAt: Optional[str] = None
