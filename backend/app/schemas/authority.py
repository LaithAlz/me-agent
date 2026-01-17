"""
Me-Agent Authority Schemas
Defines the enforcement check request/response models.
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Any
from .policy import AgentPolicy


class CartItem(BaseModel):
    """Item in a cart for authority check."""
    id: str
    title: str
    price: float = Field(..., ge=0)
    category: str
    qty: int = Field(default=1, ge=1)


class AuthorityCheckRequest(BaseModel):
    """
    Request to check if an action is allowed by the user's policy.
    This is the core enforcement endpoint.
    """
    action: Literal["cartCreate", "recommendBundle", "checkoutStart", "addToCart"] = Field(
        ..., 
        description="The action being attempted"
    )
    cartTotal: Optional[float] = Field(None, ge=0, description="Total cart value in USD")
    categories: Optional[List[str]] = Field(None, description="Categories involved in the action")
    items: Optional[List[CartItem]] = Field(None, description="Items involved in the action")
    meta: Optional[dict] = Field(None, description="Additional context")


class AuthorityCheckResponse(BaseModel):
    """
    Response from authority check.
    Always includes the decision, reason, and policy snapshot.
    """
    decision: Literal["ALLOW", "BLOCK"]
    reason: str
    policySnapshot: AgentPolicy
    blockedItems: Optional[List[CartItem]] = Field(
        None, 
        description="Items that caused the block (if any)"
    )
    auditEventId: str = Field(..., description="ID of the audit event created for this check")
