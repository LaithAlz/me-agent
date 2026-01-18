"""
Me-Agent Backend API
Main FastAPI application with all routes mounted.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import get_settings
from .core.db import init_db, close_db

# Import routers
from .api.auth import router as auth_router
from .api.policy import router as policy_router
from .api.authority import router as authority_router
from .api.audit import router as audit_router
from .api.voice import router as voice_router
from .api.avatar import router as avatar_router
from .api.agent import router as agent_router
from fastapi import Request
from fastapi.responses import JSONResponse
from backboard.exceptions import BackboardAPIError


from .api import agent as agent_module



@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup and shutdown lifecycle events.
    """
    # Startup
    print("🚀 Starting Me-Agent Backend...")
    settings = get_settings()
    
    print("MONGO_URI set?", bool(settings.MONGO_URI))
    print("MONGODB_DB_NAME:", settings.MONGO_DB_NAME)

    # Initialize database
    using_mongo = await init_db()
    if using_mongo:
        print("✅ MongoDB connected")
    else:
        print("📦 Using in-memory storage (demo mode)")
    
    print(f"🔐 Demo mode: {settings.DEMO_MODE}")
    print(f"🎙️ ElevenLabs: {'configured' if settings.ELEVENLABS_API_KEY else 'not configured'}")
    print(f"🤖 Gemini: {'configured' if settings.GOOGLE_GENERATIVE_AI_API_KEY else 'not configured'}")
    await agent_module.startup()

    yield
    
    # Shutdown
    print("👋 Shutting down Me-Agent Backend...")
    await close_db()


# Create FastAPI app
app = FastAPI(
    title="Me-Agent API",
    description="Secure, identity-bound AI shopping agent API",
    version="1.0.0",
    lifespan=lifespan,
)


# Configure CORS
settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)




# ============================================================
# Mount API Routers
# ============================================================
app.include_router(auth_router, prefix="/api")
app.include_router(policy_router, prefix="/api")
app.include_router(authority_router, prefix="/api")
app.include_router(audit_router, prefix="/api")
app.include_router(voice_router, prefix="/api")
app.include_router(avatar_router, prefix="/api")
app.include_router(agent_module.router, prefix="/api")

@app.exception_handler(BackboardAPIError)
async def backboard_exception_handler(request: Request, exc: BackboardAPIError):
    return JSONResponse(
        status_code=502,
        content={
            "message": "Backboard request failed",
            "error": str(exc),
            "backboard_status": getattr(exc, "status_code", None),
        },
    )
# ============================================================
# Health Check
# ============================================================
@app.get("/")
async def root():
    """Root endpoint - API info."""
    return {
        "name": "Me-Agent API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "demoMode": get_settings().DEMO_MODE,
    }


@app.get("/api")
async def api_info():
    """API information."""
    return {
        "endpoints": {
            "auth": {
                "POST /api/auth/register/options": "Start passkey registration",
                "POST /api/auth/register/verify": "Complete passkey registration",
                "POST /api/auth/login/options": "Start passkey login",
                "POST /api/auth/login/verify": "Complete passkey login",
                "GET /api/auth/session": "Get current session",
                "POST /api/auth/logout": "Log out",
                "POST /api/auth/demo-login": "Quick demo login (no passkey)",
            },
            "policy": {
                "GET /api/policy": "Get current policy",
                "POST /api/policy": "Update policy",
                "DELETE /api/policy": "Reset policy to defaults",
            },
            "authority": {
                "POST /api/authority/check": "Check if action is allowed (+ auto audit log)",
                "GET /api/authority/status": "Get authority layer status",
            },
            "audit": {
                "GET /api/audit": "Get audit log",
                "POST /api/audit": "Create custom audit event",
                "GET /api/audit/summary": "Get audit summary stats",
            },
            "voice": {
                "POST /api/voice": "Synthesize text to speech",
                "GET /api/voice/voices": "List available voices",
            },
            "avatar": {
                "POST /api/avatar/generate": "Generate bitmoji avatar from photo",
                "GET /api/avatar": "Get current avatar",
                "DELETE /api/avatar": "Delete avatar",
            },
        }
    }


def _parse_origins(raw: str) -> list[str]:
    raw = (raw or "").strip()
    if raw == "*" or raw.lower() == "all":
        return ["*"]
    return [o.strip() for o in raw.split(",") if o.strip()]


# ============================================================
# Run with uvicorn
# ============================================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )