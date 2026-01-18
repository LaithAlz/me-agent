"""
Me-Agent Auth Schemas
Defines WebAuthn passkey request/response models.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Any


# ============================================================
# Registration Flow
# ============================================================

class RegisterOptionsRequest(BaseModel):
    """Request to start passkey registration."""
    username: str = Field(..., min_length=1, max_length=64)
    displayName: Optional[str] = None


class RegisterOptionsResponse(BaseModel):
    """
    WebAuthn registration options.
    In demo mode, this contains simplified mock data.
    """
    challenge: str  # Base64-encoded challenge
    rp: dict        # Relying party info { id, name }
    user: dict      # User info { id, name, displayName }
    pubKeyCredParams: List[dict]
    timeout: int
    attestation: str
    authenticatorSelection: dict
    # Demo mode indicator
    demoMode: bool = False


class RegisterVerifyRequest(BaseModel):
    """Request to verify passkey registration."""
    username: str
    credential: dict  # The credential response from navigator.credentials.create()


class RegisterVerifyResponse(BaseModel):
    """Response after successful registration."""
    success: bool
    userId: str
    message: str


# ============================================================
# Login Flow
# ============================================================

class LoginOptionsRequest(BaseModel):
    """Request to start passkey login."""
    username: str


class LoginOptionsResponse(BaseModel):
    """
    WebAuthn login options.
    In demo mode, this contains simplified mock data.
    """
    challenge: str
    rpId: str
    allowCredentials: List[dict]
    timeout: int
    userVerification: str
    # Demo mode indicator
    demoMode: bool = False


class LoginVerifyRequest(BaseModel):
    """Request to verify passkey login."""
    username: str
    credential: dict  # The credential response from navigator.credentials.get()


class LoginVerifyResponse(BaseModel):
    """Response after successful login."""
    success: bool
    userId: str
    message: str


# ============================================================
# Session
# ============================================================

class SessionInfo(BaseModel):
    """Current session information."""
    authenticated: bool
    userId: Optional[str] = None
    username: Optional[str] = None
    demoMode: bool = False
