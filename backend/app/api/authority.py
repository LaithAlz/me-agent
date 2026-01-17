"""
Me-Agent Authority API Routes
Enforces policy constraints and logs all decisions.
This is the core "Authority Layer" that controls what the agent can do.
"""
import uuid
from datetime import datetime
from fastapi import APIRouter, Cookie
from typing import Optional

from ..core.db import get_policy, add_audit_event
from ..schemas.policy import AgentPolicy
from ..schemas.authority import AuthorityCheckRequest, AuthorityCheckResponse, CartItem

router = APIRouter(prefix="/authority", tags=["Authority"])

DEFAULT_DEMO_USER = "demo-user-1"


def get_user_id(meagent_user: Optional[str]) -> str:
    return meagent_user or DEFAULT_DEMO_USER


@router.post("/check", response_model=AuthorityCheckResponse)
async def check_authority(
    request: AuthorityCheckRequest,
    meagent_user: Optional[str] = Cookie(None),
):
    """
    Check if an action is allowed by the user's policy.
    This endpoint should be called BEFORE performing any agent action.
    
    Enforcement rules:
    1. If agentEnabled == false -> BLOCK (agent is disabled)
    2. If cartTotal > maxSpend -> BLOCK (exceeds budget)
    3. If any category not in allowedCategories -> BLOCK (unauthorized category)
    4. If requireConfirm == true and action == "checkoutStart" -> BLOCK (needs user click)
    
    Every call automatically creates an audit log entry.
    """
    user_id = get_user_id(meagent_user)
    
    # Get current policy
    policy_data = await get_policy(user_id)
    policy = AgentPolicy(
        maxSpend=policy_data.get("maxSpend", 150),
        allowedCategories=policy_data.get("allowedCategories", ["office"]),
        agentEnabled=policy_data.get("agentEnabled", True),
        requireConfirm=policy_data.get("requireConfirm", True),
    )
    
    # Initialize decision
    decision = "ALLOW"
    reason = "Action permitted by policy"
    blocked_items: list[CartItem] = []
    
    # ============================================================
    # Rule 1: Check if agent is enabled
    # ============================================================
    if not policy.agentEnabled:
        decision = "BLOCK"
        reason = "Agent is disabled. Enable it in your policy settings to allow autonomous actions."
    
    # ============================================================
    # Rule 2: Check budget (cartTotal vs maxSpend)
    # ============================================================
    elif request.cartTotal is not None and request.cartTotal > policy.maxSpend:
        decision = "BLOCK"
        reason = f"Cart total ${request.cartTotal:.2f} exceeds your spending limit of ${policy.maxSpend:.2f}. Reduce items or increase your limit."
    
    # ============================================================
    # Rule 3: Check categories
    # ============================================================
    elif request.categories:
        unauthorized = [cat for cat in request.categories if cat not in policy.allowedCategories]
        if unauthorized:
            decision = "BLOCK"
            reason = f"Category '{unauthorized[0]}' is not in your allowed categories: {', '.join(policy.allowedCategories)}. Update your policy to include it."
    
    # ============================================================
    # Rule 3b: Check individual items for category violations
    # ============================================================
    elif request.items:
        for item in request.items:
            if item.category not in policy.allowedCategories:
                decision = "BLOCK"
                blocked_items.append(item)
        
        if blocked_items:
            blocked_names = [item.title for item in blocked_items[:3]]
            reason = f"Items from unauthorized categories blocked: {', '.join(blocked_names)}. Allowed categories: {', '.join(policy.allowedCategories)}."
    
    # ============================================================
    # Rule 4: Require confirmation for checkout
    # ============================================================
    if decision == "ALLOW" and policy.requireConfirm and request.action == "checkoutStart":
        decision = "BLOCK"
        reason = "Checkout requires your explicit confirmation. Click the checkout button to proceed."
    
    # ============================================================
    # Create audit event
    # ============================================================
    event_id = f"evt_{uuid.uuid4().hex[:12]}"
    audit_event = await add_audit_event(user_id, {
        "id": event_id,
        "ts": datetime.utcnow().isoformat(),
        "actor": "agent",
        "action": request.action,
        "decision": decision,
        "reason": reason,
        "policySnapshot": policy.model_dump(),
        "meta": {
            "cartTotal": request.cartTotal,
            "categories": request.categories,
            "itemCount": len(request.items) if request.items else 0,
        },
    })
    
    return AuthorityCheckResponse(
        decision=decision,
        reason=reason,
        policySnapshot=policy,
        blockedItems=blocked_items if blocked_items else None,
        auditEventId=event_id,
    )


@router.get("/status")
async def authority_status(meagent_user: Optional[str] = Cookie(None)):
    """
    Get a quick summary of the authority layer status.
    Useful for UI to show current state.
    """
    user_id = get_user_id(meagent_user)
    policy_data = await get_policy(user_id)
    
    return {
        "userId": user_id,
        "agentEnabled": policy_data.get("agentEnabled", True),
        "maxSpend": policy_data.get("maxSpend", 150),
        "allowedCategories": policy_data.get("allowedCategories", ["office"]),
        "requireConfirm": policy_data.get("requireConfirm", True),
        "message": "Authority layer active" if policy_data.get("agentEnabled", True) else "Agent is disabled",
    }
