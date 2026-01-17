"""
Me-Agent Avatar API Routes
Generates bitmoji-style avatars from user photos using Gemini API.
"""
import base64
import httpx
from fastapi import APIRouter, Cookie, HTTPException
from typing import Optional

from ..core.config import get_settings
from ..core.db import save_avatar, get_avatar
from ..schemas.avatar import AvatarGenerateRequest, AvatarGenerateResponse, AvatarGetResponse

router = APIRouter(prefix="/avatar", tags=["Avatar"])

DEFAULT_DEMO_USER = "demo-user-1"


def get_user_id(meagent_user: Optional[str]) -> str:
    return meagent_user or DEFAULT_DEMO_USER


@router.post("/generate", response_model=AvatarGenerateResponse)
async def generate_avatar(
    request: AvatarGenerateRequest,
    meagent_user: Optional[str] = Cookie(None),
):
    """
    Generate a bitmoji-style avatar from a user's photo using Gemini API.
    
    The photo should be base64-encoded. The API will:
    1. Analyze the photo to understand facial features
    2. Generate a cartoon/bitmoji style avatar matching those features
    3. Return the generated avatar as base64
    
    If Gemini API key is not available, returns an error.
    """
    settings = get_settings()
    user_id = get_user_id(meagent_user)
    
    if not settings.GOOGLE_GENERATIVE_AI_API_KEY:
        return AvatarGenerateResponse(
            success=False,
            avatarBase64=None,
            style=request.style,
            error="Gemini API key not configured. Cannot generate avatar.",
        )
    
    try:
        # Use Gemini's vision capabilities to analyze the photo
        # and generate a bitmoji-style description, then use imagen or
        # return a styled prompt for the frontend to display
        
        import google.generativeai as genai
        
        genai.configure(api_key=settings.GOOGLE_GENERATIVE_AI_API_KEY)
        
        # Decode the base64 image
        try:
            image_data = base64.b64decode(request.imageBase64)
        except Exception:
            return AvatarGenerateResponse(
                success=False,
                avatarBase64=None,
                style=request.style,
                error="Invalid base64 image data",
            )
        
        # Use Gemini's image generation model to create a bitmoji
        model = genai.GenerativeModel('gemini-2.5-flash-image')
        
        # Create the image part for Gemini
        image_part = {
            "mime_type": "image/jpeg",
            "data": request.imageBase64,
        }
        
        prompt = "Generate a bitmoji of this person. Make the background a solid colour."

        response = model.generate_content([prompt, image_part])
        
        # Check if we got an image in the response
        if response.candidates and len(response.candidates) > 0:
            candidate = response.candidates[0]
            if hasattr(candidate.content, 'parts') and len(candidate.content.parts) > 0:
                for part in candidate.content.parts:
                    if hasattr(part, 'inline_data') and part.inline_data:
                        # Extract the generated image
                        generated_image_data = part.inline_data.data
                        generated_image_base64 = base64.b64encode(generated_image_data).decode('utf-8')
                        
                        # Store the generated avatar
                        await save_avatar(user_id, generated_image_base64, request.style)
                        
                        return AvatarGenerateResponse(
                            success=True,
                            avatarBase64=generated_image_base64,
                            avatarFormat="jpeg",
                            style=request.style,
                            error=None,
                        )
        
        # If no image was generated, return error
        return AvatarGenerateResponse(
            success=False,
            avatarBase64=None,
            avatarFormat="jpeg",
            style=request.style,
            error="Failed to generate bitmoji image from Gemini",
        )
        
    except Exception as e:
        return AvatarGenerateResponse(
            success=False,
            avatarBase64=None,
            avatarFormat="jpeg",
            style=request.style,
            error=f"Avatar generation failed: {str(e)}",
        )


@router.get("", response_model=AvatarGetResponse)
async def get_user_avatar(meagent_user: Optional[str] = Cookie(None)):
    """
    Get the current user's avatar.
    """
    user_id = get_user_id(meagent_user)
    
    avatar = await get_avatar(user_id)
    
    if avatar:
        return AvatarGetResponse(
            hasAvatar=True,
            avatarBase64=avatar.get("avatar"),
            avatarFormat=avatar.get("format", "jpeg"),
            style=avatar.get("style"),
            createdAt=avatar.get("createdAt"),
        )
    else:
        return AvatarGetResponse(
            hasAvatar=False,
        )


@router.delete("")
async def delete_avatar(meagent_user: Optional[str] = Cookie(None)):
    """
    Delete the current user's avatar.
    """
    user_id = get_user_id(meagent_user)
    
    # Save empty avatar to effectively delete
    await save_avatar(user_id, "", "none")
    
    return {"success": True, "message": "Avatar deleted"}
