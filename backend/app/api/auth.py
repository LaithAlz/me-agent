"""
Me-Agent Auth API Routes
WebAuthn passkey registration and login flows with demo mode fallback.
"""
import uuid
import base64
import secrets
from datetime import datetime
from fastapi import APIRouter, Response, Cookie, HTTPException
from typing import Optional

from ..core.config import get_settings
from ..core.db import (
    save_user, 
    get_user_by_username, 
    get_user_by_id,
    save_credential, 
    get_credentials_for_user,
)
from ..schemas.auth import (
    RegisterOptionsRequest,
    RegisterOptionsResponse,
    RegisterVerifyRequest,
    RegisterVerifyResponse,
    LoginOptionsRequest,
    LoginOptionsResponse,
    LoginVerifyRequest,
    LoginVerifyResponse,
    SessionInfo,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

# In-memory challenge store (for demo; production would use Redis/DB)
_pending_challenges: dict[str, dict] = {}


def generate_challenge() -> str:
    """Generate a random challenge for WebAuthn."""
    return base64.urlsafe_b64encode(secrets.token_bytes(32)).decode()


# ============================================================
# Registration Flow
# ============================================================

@router.post("/register/options", response_model=RegisterOptionsResponse)
async def register_options(request: RegisterOptionsRequest):
    """
    Step 1 of registration: Get WebAuthn options.
    In demo mode, returns simplified mock options.
    """
    settings = get_settings()
    
    # Check if username already exists
    existing_user = await get_user_by_username(request.username)
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    # Generate user ID
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    display_name = request.displayName or request.username
    
    # Generate challenge
    challenge = generate_challenge()
    
    # Store pending challenge
    _pending_challenges[request.username] = {
        "challenge": challenge,
        "userId": user_id,
        "displayName": display_name,
        "type": "register",
        "createdAt": datetime.utcnow().isoformat(),
    }
    
    # Build WebAuthn options
    options = RegisterOptionsResponse(
        challenge=challenge,
        rp={
            "id": settings.WEBAUTHN_RP_ID,
            "name": settings.WEBAUTHN_RP_NAME,
        },
        user={
            "id": base64.urlsafe_b64encode(user_id.encode()).decode(),
            "name": request.username,
            "displayName": display_name,
        },
        pubKeyCredParams=[
            {"type": "public-key", "alg": -7},   # ES256
            {"type": "public-key", "alg": -257}, # RS256
        ],
        timeout=60000,
        attestation="none",
        authenticatorSelection={
            "authenticatorAttachment": "platform",
            "userVerification": "required",
            "residentKey": "required",
            "transports": ["internal"],
        },
        demoMode=settings.DEMO_MODE,
    )
    
    return options


@router.post("/register/verify", response_model=RegisterVerifyResponse)
async def register_verify(request: RegisterVerifyRequest, response: Response):
    """
    Step 2 of registration: Verify the credential and create user.
    In demo mode, accepts any credential response.
    """
    settings = get_settings()
    
    # Get pending challenge
    pending = _pending_challenges.get(request.username)
    if not pending or pending["type"] != "register":
        raise HTTPException(status_code=400, detail="No pending registration for this username")
    
    user_id = pending["userId"]
    display_name = pending["displayName"]
    
    if settings.DEMO_MODE:
        # Demo mode: Accept any credential, simulate success
        # In production, we would verify the attestation here using webauthn library
        
        # Create user
        await save_user(user_id, request.username, display_name)
        
        # Save credential (demo: store the credential ID from the response)
        credential_id = request.credential.get("id", f"demo_cred_{uuid.uuid4().hex[:8]}")
        await save_credential(user_id, {
            "credentialId": credential_id,
            "publicKey": "demo_public_key",  # In production: actual public key
            "signCount": 0,
            "transports": ["internal"],
        })
        
        # Clean up challenge
        del _pending_challenges[request.username]
        
        # Set session cookie
        response.set_cookie(
            key="meagent_user",
            value=user_id,
            httponly=True,
            samesite="lax",
            max_age=86400 * 7,  # 7 days
        )
        response.set_cookie(
            key="meagent_username",
            value=request.username,
            httponly=False,  # Allow JS to read username for display
            samesite="lax",
            max_age=86400 * 7,
        )
        
        return RegisterVerifyResponse(
            success=True,
            userId=user_id,
            message="Demo mode: Passkey registered successfully",
        )
    else:
        # Production mode: Full WebAuthn verification
        # This would use the webauthn library to verify the attestation
        raise HTTPException(status_code=501, detail="Production WebAuthn not implemented yet")


# ============================================================
# Additional Passkey Registration (for existing users)
# ============================================================

@router.post("/register-additional/options", response_model=RegisterOptionsResponse)
async def register_additional_options(
    request: RegisterOptionsRequest,
    meagent_user: Optional[str] = Cookie(None),
):
    """
    Register an additional passkey for an already-authenticated user.
    Requires existing session (meagent_user cookie).
    """
    settings = get_settings()
    
    # Require authentication
    if not meagent_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get existing user
    user = await get_user_by_id(meagent_user)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Generate challenge
    challenge = generate_challenge()
    
    # Store pending challenge with existing user ID
    display_name = request.displayName or f"Passkey {len(user.get('credentials', []))+1}"
    _pending_challenges[f"{meagent_user}_add"] = {
        "challenge": challenge,
        "userId": meagent_user,
        "displayName": display_name,
        "type": "register_additional",
        "createdAt": datetime.utcnow().isoformat(),
    }
    
    # Build WebAuthn options with existing user info
    options = RegisterOptionsResponse(
        challenge=challenge,
        rp={
            "id": settings.WEBAUTHN_RP_ID,
            "name": settings.WEBAUTHN_RP_NAME,
        },
        user={
            "id": base64.urlsafe_b64encode(meagent_user.encode()).decode(),
            "name": request.username,
            "displayName": display_name,
        },
        pubKeyCredParams=[
            {"type": "public-key", "alg": -7},   # ES256
            {"type": "public-key", "alg": -257}, # RS256
        ],
        timeout=60000,
        attestation="none",
        authenticatorSelection={
            "authenticatorAttachment": "platform",
            "userVerification": "required",
            "residentKey": "required",
            "transports": ["internal"],
        },
        demoMode=settings.DEMO_MODE,
    )
    
    return options


@router.post("/register-additional/verify", response_model=RegisterVerifyResponse)
async def register_additional_verify(
    request: RegisterVerifyRequest,
    meagent_user: Optional[str] = Cookie(None),
):
    """
    Verify and register an additional passkey for an existing user.
    """
    settings = get_settings()
    
    # Require authentication
    if not meagent_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get pending challenge
    pending = _pending_challenges.get(f"{meagent_user}_add")
    if not pending or pending["type"] != "register_additional":
        raise HTTPException(status_code=400, detail="No pending passkey registration")
    
    if settings.DEMO_MODE:
        # Demo mode: Accept and store the credential
        credential_id = request.credential.get("id", f"demo_cred_{uuid.uuid4().hex[:8]}")
        
        # Add credential to user
        await save_credential(meagent_user, {
            "credentialId": credential_id,
            "publicKey": "demo_public_key",
            "signCount": 0,
            "transports": ["internal"],
            "displayName": pending["displayName"],
        })
        
        # Clean up challenge
        del _pending_challenges[f"{meagent_user}_add"]
        
        return RegisterVerifyResponse(
            success=True,
            userId=meagent_user,
            message=f"Demo mode: Additional passkey '{pending['displayName']}' registered successfully",
        )
    else:
        raise HTTPException(status_code=501, detail="Production WebAuthn not implemented yet")


# ============================================================
# Login Flow
# ============================================================

@router.post("/login/options", response_model=LoginOptionsResponse)
async def login_options(request: LoginOptionsRequest):
    """
    Step 1 of login: Get WebAuthn assertion options.
    """
    settings = get_settings()
    
    # Check if user exists
    user = await get_user_by_username(request.username)
    if not user:
        if settings.DEMO_MODE:
            # Demo mode: auto-create a user to allow login flow
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            display_name = request.username
            await save_user(user_id, request.username, display_name)
            user = await get_user_by_username(request.username)
        else:
            raise HTTPException(status_code=404, detail="User not found")

    user_id = user["id"]
    
    # Get user's credentials
    credentials = await get_credentials_for_user(user_id)
    
    # Generate challenge
    challenge = generate_challenge()
    
    # Store pending challenge
    _pending_challenges[request.username] = {
        "challenge": challenge,
        "userId": user_id,
        "type": "login",
        "createdAt": datetime.utcnow().isoformat(),
    }
    
    # Build allowCredentials list
    allow_credentials = [
        {
            "type": "public-key",
            "id": cred.get("credentialId"),
            "transports": cred.get("transports", ["internal"]),
        }
        for cred in credentials
    ]
    
    return LoginOptionsResponse(
        challenge=challenge,
        rpId=settings.WEBAUTHN_RP_ID,
        allowCredentials=allow_credentials,
        timeout=60000,
        userVerification="required",
        demoMode=settings.DEMO_MODE,
    )


@router.post("/login/verify", response_model=LoginVerifyResponse)
async def login_verify(request: LoginVerifyRequest, response: Response):
    """
    Step 2 of login: Verify the assertion and create session.
    """
    settings = get_settings()
    
    # Get pending challenge
    pending = _pending_challenges.get(request.username)
    if not pending or pending["type"] != "login":
        raise HTTPException(status_code=400, detail="No pending login for this username")
    
    user_id = pending["userId"]
    
    if settings.DEMO_MODE:
        # Demo mode: Accept any assertion, simulate success
        
        # Clean up challenge
        del _pending_challenges[request.username]
        
        # Set session cookie
        response.set_cookie(
            key="meagent_user",
            value=user_id,
            httponly=True,
            samesite="lax",
            max_age=86400 * 7,
        )
        response.set_cookie(
            key="meagent_username",
            value=request.username,
            httponly=False,
            samesite="lax",
            max_age=86400 * 7,
        )
        
        return LoginVerifyResponse(
            success=True,
            userId=user_id,
            message="Demo mode: Passkey login successful",
        )
    else:
        raise HTTPException(status_code=501, detail="Production WebAuthn not implemented yet")


# ============================================================
# Session Management
# ============================================================

@router.get("/session", response_model=SessionInfo)
async def get_session(
    meagent_user: Optional[str] = Cookie(None),
    meagent_username: Optional[str] = Cookie(None),
):
    """Get current session info."""
    settings = get_settings()
    
    if meagent_user:
        return SessionInfo(
            authenticated=True,
            userId=meagent_user,
            username=meagent_username,
            demoMode=settings.DEMO_MODE,
        )
    else:
        return SessionInfo(
            authenticated=False,
            demoMode=settings.DEMO_MODE,
        )


@router.post("/logout")
async def logout(response: Response):
    """Log out and clear session."""
    response.delete_cookie("meagent_user")
    response.delete_cookie("meagent_username")
    return {"success": True, "message": "Logged out"}


@router.post("/demo-login")
async def demo_login(response: Response):
    """
    Quick demo login without passkey flow.
    Creates a demo user session for testing.
    """
    demo_user_id = "demo-user-1"
    demo_username = "demo"
    
    # Ensure demo user exists
    user = await get_user_by_id(demo_user_id)
    if not user:
        await save_user(demo_user_id, demo_username, "Demo User")
    
    response.set_cookie(
        key="meagent_user",
        value=demo_user_id,
        httponly=True,
        samesite="lax",
        max_age=86400,
    )
    response.set_cookie(
        key="meagent_username",
        value=demo_username,
        httponly=False,
        samesite="lax",
        max_age=86400,
    )
    
    return {
        "success": True,
        "userId": demo_user_id,
        "username": demo_username,
        "message": "Demo login successful (no passkey required)",
    }
