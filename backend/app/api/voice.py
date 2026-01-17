"""
Me-Agent Voice API Routes
Text-to-speech using ElevenLabs API with voice cloning support.
"""
import base64
import httpx
from fastapi import APIRouter, HTTPException, UploadFile, File
from io import BytesIO

from ..core.config import get_settings
from ..core.db import save_cloned_voice_id, get_cloned_voice_id
from ..schemas.voice import VoiceRequest, VoiceResponse

router = APIRouter(prefix="/voice", tags=["Voice"])

# ElevenLabs API endpoint
ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech"
ELEVENLABS_CLONE_URL = "https://api.elevenlabs.io/v1/voices/add"


@router.post("", response_model=VoiceResponse)
async def synthesize_voice(request: VoiceRequest):
    """
    Convert text to speech using ElevenLabs API.
    Uses user's cloned voice if available, otherwise uses default.
    If ELEVENLABS_API_KEY is not set, returns a mock response.
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
    
    # Try to get user's cloned voice, fall back to default
    try:
        cloned_voice_id = await get_cloned_voice_id()
        voice_id = cloned_voice_id or request.voiceId or settings.ELEVENLABS_VOICE_ID
    except:
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


@router.post("/clone")
async def clone_voice(file: UploadFile = File(...)):
    """
    Clone user's voice from audio file.
    Sends audio sample to ElevenLabs and stores the voice ID.
    """
    settings = get_settings()
    
    if not settings.ELEVENLABS_API_KEY:
        return {
            "success": False,
            "error": "ElevenLabs API key not configured",
        }
    
    try:
        # Read audio file
        audio_content = await file.read()
        
        if not audio_content:
            return {
                "success": False,
                "error": "Audio file is empty",
            }
        
        # Prepare multipart form data for voice cloning
        files = {
            "files": (file.filename, BytesIO(audio_content), file.content_type),
        }
        data = {
            "name": "My Cloned Voice",
            "description": "User-cloned voice for Me-Agent",
        }
        
        headers = {
            "xi-api-key": settings.ELEVENLABS_API_KEY,
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                ELEVENLABS_CLONE_URL,
                files=files,
                data=data,
                headers=headers,
            )
            
            if response.status_code == 201:
                result = response.json()
                voice_id = result.get("voice_id")
                
                if voice_id:
                    # Save cloned voice ID to database
                    await save_cloned_voice_id(voice_id)
                    return {
                        "success": True,
                        "voiceId": voice_id,
                        "message": "Voice cloned successfully",
                    }
                else:
                    return {
                        "success": False,
                        "error": "No voice ID returned from API",
                    }
            else:
                error_msg = f"ElevenLabs API error: {response.status_code}"
                try:
                    error_data = response.json()
                    error_msg = error_data.get("detail", {}).get("message", error_msg)
                except:
                    pass
                
                return {
                    "success": False,
                    "error": error_msg,
                }
    
    except Exception as e:
        return {
            "success": False,
            "error": f"Voice cloning failed: {str(e)}",
        }


@router.post("/use")
async def use_voice(request: dict):
    """
    Use a pre-existing ElevenLabs voice ID.
    Accepts {"voiceId": "7zEWfkhTZw83mmRtzliA"} and saves it for synthesis.
    """
    try:
        voice_id = request.get("voiceId")
        if not voice_id:
            return {
                "success": False,
                "error": "voiceId is required",
            }
        
        await save_cloned_voice_id(voice_id)
        return {
            "success": True,
            "voiceId": voice_id,
            "message": "Voice ID saved successfully",
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to save voice ID: {str(e)}",
        }


@router.get("/clone/status")
async def get_clone_status():
    """
    Get status of cloned voice (if exists).
    """
    try:
        cloned_voice_id = await get_cloned_voice_id()
        return {
            "hasClonedVoice": bool(cloned_voice_id),
            "voiceId": cloned_voice_id,
        }
    except Exception as e:
        return {
            "hasClonedVoice": False,
            "error": str(e),
        }


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
