"""
Me-Agent Avatar API Routes
Generates bitmoji-style avatars from user photos using Gemini API.
"""
import base64
import httpx
from fastapi import APIRouter, Cookie, HTTPException
from typing import Optional
import hashlib

from ..core.config import get_settings
from ..core.db import save_avatar, get_avatar
from ..schemas.avatar import AvatarGenerateRequest, AvatarGenerateResponse, AvatarGetResponse

router = APIRouter(prefix="/avatar", tags=["Avatar"])

DEFAULT_DEMO_USER = "demo-user-1"


def get_user_id(meagent_user: Optional[str]) -> str:
    return meagent_user or DEFAULT_DEMO_USER


def generate_avatar_svg(description: str) -> str:
    """
    Generate a bitmoji avatar using Gemini's image generation models.
    Takes the Gemini analysis and generates an actual cartoon avatar image.
    """
    settings = get_settings()
    
    if not settings.GOOGLE_GENERATIVE_AI_API_KEY:
        return None
    
    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.GOOGLE_GENERATIVE_AI_API_KEY)
        
        # Create a detailed prompt for generating a bitmoji avatar
        prompt = f"""Generate a cute cartoon bitmoji-style avatar based on this description:

{description}

Requirements:
- Simple, colorful cartoon style
- Friendly and approachable face
- Bitmoji or emoji-like art style
- Clean and polished
- Square format (200x200)
- Cheerful expression"""
        
        # Use Gemini 2.5 Flash Image for generation
        model = genai.GenerativeModel('gemini-2.5-flash-image')
        
        # Generate image using generate_content
        response = model.generate_content(prompt)
        
        # Extract the generated image from response
        if response.candidates and len(response.candidates) > 0:
            candidate = response.candidates[0]
            if hasattr(candidate, 'content') and hasattr(candidate.content, 'parts'):
                for part in candidate.content.parts:
                    if hasattr(part, 'inline_data') and part.inline_data:
                        image_data = part.inline_data.data
                        return base64.b64encode(image_data).decode('utf-8')
        
        print("No image data in Gemini response")
        return None
        
    except Exception as e:
        print(f"Gemini image generation failed: {str(e)}")
        return None


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
        
        # Use Gemini to analyze the image and describe avatar features
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Create the image part for Gemini
        image_part = {
            "mime_type": "image/jpeg",
            "data": request.imageBase64,
        }
        
        prompt = f"""Analyze this photo of a person and create a detailed description for generating a {request.style}-style cartoon avatar.

Describe these features in a structured way:
1. Face shape (round, oval, square, heart)
2. Hair style and color
3. Eye shape and color
4. Skin tone
5. Any distinctive features (glasses, facial hair, accessories)
6. Expression/mood

Then provide a single-line prompt that could be used to generate a {request.style}-style avatar matching this person.

Format your response as:
FEATURES:
[feature descriptions]

AVATAR_PROMPT:
[single line prompt for avatar generation]"""

        response = model.generate_content([prompt, image_part])
        
        avatar_description = response.text
        print(f"Avatar description from Gemini: {avatar_description[:100]}...")
        
        # Generate an actual bitmoji avatar image from the description using Gemini
        generated_avatar_base64 = generate_avatar_svg(avatar_description)
        
        if not generated_avatar_base64:
            # Fallback to DiceBear if Gemini generation fails
            avatar_seed = hashlib.md5(avatar_description.encode()).hexdigest()
            url = f"https://api.dicebear.com/7.x/avataaars/png?seed={avatar_seed}&scale=90"
            try:
                dicebear_response = httpx.get(url, timeout=5)
                if dicebear_response.status_code == 200:
                    generated_avatar_base64 = base64.b64encode(dicebear_response.content).decode('utf-8')
            except Exception as e:
                print(f"DiceBear fallback failed: {str(e)}")
                generated_avatar_base64 = None
        
        if not generated_avatar_base64:
            # Last resort: return original image
            generated_avatar_base64 = request.imageBase64
        
        # Store the generated avatar
        await save_avatar(user_id, generated_avatar_base64, request.style)
        
        return AvatarGenerateResponse(
            success=True,
            avatarBase64=generated_avatar_base64,
            style=request.style,
            error=None,
        )
        
    except Exception as e:
        return AvatarGenerateResponse(
            success=False,
            avatarBase64=None,
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
