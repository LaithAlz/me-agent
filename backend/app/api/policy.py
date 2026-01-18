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

ALL_ALLOWED_CATEGORIES = [
    "office",
    "electronics",
    "clothing",
    "home",
    "sports",
    "books",
    "beauty",
    "food",
    "accessories",
    "lifestyle",
    "fashion",
    "grocery",
    "fitness",
    "entertainment",
    "wellness",
    "smart_home",
    "construction",
]

LEGACY_CATEGORY_SETS = [
    {"office"},
    {"office", "electronics"},
    {"office", "electronics", "clothing", "home", "sports", "books", "beauty", "food"},
]


def _should_expand_categories(categories: list[str]) -> bool:
    if not categories:
        return True
    return set(categories) in LEGACY_CATEGORY_SETS


def _normalize_categories(categories: Optional[list[str]]) -> list[str]:
    if not categories:
        return []
    normalized: list[str] = []
    for cat in categories:
        if not cat:
            continue
        value = cat.strip().lower()
        if not value:
            continue
        normalized.append(value)
    return normalized


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
    
    normalized_allowed = _normalize_categories(
        policy_data.get("allowedCategories", list(ALL_ALLOWED_CATEGORIES))
    )

    # Auto-migrate legacy defaults to full selectable list
    if _should_expand_categories(normalized_allowed):
        policy_data["allowedCategories"] = list(ALL_ALLOWED_CATEGORIES)
        policy_data["policyVersion"] = 2
        await save_policy(user_id, policy_data)

    # Build AgentPolicy from stored data
    policy = AgentPolicy(
        maxSpend=policy_data.get("maxSpend", 150),
        allowedCategories=_normalize_categories(
            policy_data.get("allowedCategories", list(ALL_ALLOWED_CATEGORIES))
        ) or list(ALL_ALLOWED_CATEGORIES),
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
    allowed_categories = (
        _normalize_categories(update.allowedCategories)
        if update.allowedCategories is not None
        else _normalize_categories(current.get("allowedCategories", list(ALL_ALLOWED_CATEGORIES)))
    )
    new_policy = {
        "maxSpend": update.maxSpend if update.maxSpend is not None else current.get("maxSpend", 150),
        "allowedCategories": allowed_categories or list(ALL_ALLOWED_CATEGORIES),
        "agentEnabled": update.agentEnabled if update.agentEnabled is not None else current.get("agentEnabled", True),
        "requireConfirm": update.requireConfirm if update.requireConfirm is not None else current.get("requireConfirm", True),
        "policyVersion": 2,
    }
    
    # Validate
    if new_policy["maxSpend"] < 0:
        raise HTTPException(status_code=400, detail="maxSpend must be non-negative")
    
    if not isinstance(new_policy["allowedCategories"], list):
        raise HTTPException(status_code=400, detail="allowedCategories must be a list")
    
    # Validate categories against known categories
    VALID_CATEGORIES = set(ALL_ALLOWED_CATEGORIES)
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
        "allowedCategories": list(ALL_ALLOWED_CATEGORIES),
        "agentEnabled": True,
        "requireConfirm": True,
        "policyVersion": 2,
    }
    
    saved = await save_policy(user_id, default_policy)
    
    return {
        "success": True,
        "message": "Policy reset to defaults",
        "policy": saved,
    }
