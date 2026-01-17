"""
Me-Agent Policy API Routes
Manages user permission policies for the authority layer.
"""
from fastapi import APIRouter, Cookie, HTTPException
from typing import Optional

from ..core.db import get_policy, save_policy
from ..schemas.policy import AgentPolicy, PolicyUpdateRequest, PolicyResponse

router = APIRouter(prefix="/policy", tags=["Policy"])

# Default demo user if not signed in
DEFAULT_DEMO_USER = "demo-user-1"


def get_user_id(meagent_user: Optional[str]) -> str:
    """Get user ID from cookie or return demo user."""
    return meagent_user or DEFAULT_DEMO_USER


@router.get("", response_model=PolicyResponse)
async def get_user_policy(meagent_user: Optional[str] = Cookie(None)):
    """
    Get the current policy for the signed-in user.
    Returns default policy if user has no custom policy set.
    """
    user_id = get_user_id(meagent_user)
    
    policy_data = await get_policy(user_id)
    
    # Build AgentPolicy from stored data
    policy = AgentPolicy(
        maxSpend=policy_data.get("maxSpend", 150),
        allowedCategories=policy_data.get("allowedCategories", ["office"]),
        agentEnabled=policy_data.get("agentEnabled", True),
        requireConfirm=policy_data.get("requireConfirm", True),
    )
    
    return PolicyResponse(
        userId=user_id,
        policy=policy,
        updatedAt=policy_data.get("updatedAt"),
    )


@router.post("", response_model=PolicyResponse)
async def update_user_policy(
    update: PolicyUpdateRequest,
    meagent_user: Optional[str] = Cookie(None),
):
    """
    Update the policy for the signed-in user.
    Only provided fields are updated; others retain their current values.
    """
    user_id = get_user_id(meagent_user)
    
    # Get current policy
    current = await get_policy(user_id)
    
    # Merge updates
    new_policy = {
        "maxSpend": update.maxSpend if update.maxSpend is not None else current.get("maxSpend", 150),
        "allowedCategories": update.allowedCategories if update.allowedCategories is not None else current.get("allowedCategories", ["office"]),
        "agentEnabled": update.agentEnabled if update.agentEnabled is not None else current.get("agentEnabled", True),
        "requireConfirm": update.requireConfirm if update.requireConfirm is not None else current.get("requireConfirm", True),
    }
    
    # Validate
    if new_policy["maxSpend"] < 0:
        raise HTTPException(status_code=400, detail="maxSpend must be non-negative")
    
    if not isinstance(new_policy["allowedCategories"], list):
        raise HTTPException(status_code=400, detail="allowedCategories must be a list")
    
    # Validate categories against known categories
    VALID_CATEGORIES = {"office", "electronics", "clothing", "home", "sports", "books", "beauty", "food"}
    invalid_cats = set(new_policy["allowedCategories"]) - VALID_CATEGORIES
    if invalid_cats:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid categories: {invalid_cats}. Valid: {VALID_CATEGORIES}"
        )
    
    # Save
    saved = await save_policy(user_id, new_policy)
    
    policy = AgentPolicy(
        maxSpend=saved["maxSpend"],
        allowedCategories=saved["allowedCategories"],
        agentEnabled=saved["agentEnabled"],
        requireConfirm=saved["requireConfirm"],
    )
    
    return PolicyResponse(
        userId=user_id,
        policy=policy,
        updatedAt=saved.get("updatedAt"),
    )


@router.delete("")
async def reset_policy(meagent_user: Optional[str] = Cookie(None)):
    """
    Reset policy to defaults.
    """
    user_id = get_user_id(meagent_user)
    
    default_policy = {
        "maxSpend": 150,
        "allowedCategories": ["office", "electronics"],
        "agentEnabled": True,
        "requireConfirm": True,
    }
    
    saved = await save_policy(user_id, default_policy)
    
    return {
        "success": True,
        "message": "Policy reset to defaults",
        "policy": saved,
    }
