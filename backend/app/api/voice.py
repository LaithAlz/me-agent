"""
Me-Agent Voice API Routes
Text-to-speech using ElevenLabs API.
"""
import base64
import httpx
from fastapi import APIRouter, HTTPException

from ..core.config import get_settings
from ..schemas.voice import VoiceRequest, VoiceResponse

router = APIRouter(prefix="/voice", tags=["Voice"])

# ElevenLabs API endpoint
ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech"


@router.post("", response_model=VoiceResponse)
async def synthesize_voice(request: VoiceRequest):
    """
    Convert text to speech using ElevenLabs API.
    
    If ELEVENLABS_API_KEY is not set, returns a mock response
    with the original text (does not break UI).
    """
    settings = get_settings()
    
    # Check if API key is available
    if not settings.ELEVENLABS_API_KEY:
        # Return mock response
        return VoiceResponse(
            success=True,
            audioBase64=None,
            contentType="audio/mpeg",
            text=request.text,
            mock=True,
            error="ElevenLabs API key not configured. Audio not generated.",
        )
    
    # Use provided voice ID or default
    voice_id = request.voiceId or settings.ELEVENLABS_VOICE_ID
    
    url = f"{ELEVENLABS_API_URL}/{voice_id}"
    
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": settings.ELEVENLABS_API_KEY,
    }
    
    payload = {
        "text": request.text,
        "model_id": "eleven_turbo_v2",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75,
        },
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            
            if response.status_code == 200:
                # Success - encode audio as base64
                audio_base64 = base64.b64encode(response.content).decode("utf-8")
                
                return VoiceResponse(
                    success=True,
                    audioBase64=audio_base64,
                    contentType="audio/mpeg",
                    text=request.text,
                    mock=False,
                )
            else:
                # API error
                error_msg = f"ElevenLabs API error: {response.status_code}"
                try:
                    error_detail = response.json()
                    error_msg = error_detail.get("detail", {}).get("message", error_msg)
                except:
                    pass
                
                return VoiceResponse(
                    success=False,
                    audioBase64=None,
                    contentType="audio/mpeg",
                    text=request.text,
                    mock=True,
                    error=error_msg,
                )
    
    except httpx.TimeoutException:
        return VoiceResponse(
            success=False,
            audioBase64=None,
            contentType="audio/mpeg",
            text=request.text,
            mock=True,
            error="ElevenLabs API timeout. Please try again.",
        )
    
    except Exception as e:
        return VoiceResponse(
            success=False,
            audioBase64=None,
            contentType="audio/mpeg",
            text=request.text,
            mock=True,
            error=f"Voice synthesis failed: {str(e)}",
        )


@router.get("/voices")
async def list_voices():
    """
    List available voices from ElevenLabs.
    Useful for letting users choose their preferred voice.
    """
    settings = get_settings()
    
    if not settings.ELEVENLABS_API_KEY:
        return {
            "available": False,
            "voices": [],
            "message": "ElevenLabs API key not configured",
        }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                "https://api.elevenlabs.io/v1/voices",
                headers={"xi-api-key": settings.ELEVENLABS_API_KEY},
            )
            
            if response.status_code == 200:
                data = response.json()
                voices = [
                    {
                        "id": v["voice_id"],
                        "name": v["name"],
                        "category": v.get("category", "unknown"),
                    }
                    for v in data.get("voices", [])
                ]
                return {
                    "available": True,
                    "voices": voices,
                    "default": settings.ELEVENLABS_VOICE_ID,
                }
            else:
                return {
                    "available": False,
                    "voices": [],
                    "message": f"Failed to fetch voices: {response.status_code}",
                }
    
    except Exception as e:
        return {
            "available": False,
            "voices": [],
            "message": f"Error fetching voices: {str(e)}",
        }
