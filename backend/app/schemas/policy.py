"""
Me-Agent Policy Schemas
Defines the AgentPolicy model for authority/permission control.
"""
from pydantic import BaseModel, Field
from typing import List, Optional


class AgentPolicy(BaseModel):
    """
    Defines what the agent is allowed to do on behalf of the user.
    This is the core of the "Authority" layer.
    All monetary values are in Canadian dollars (CAD).
    """
    maxSpend: float = Field(default=150.0, ge=0, description="Maximum spend limit in CAD (Canadian dollars)")
    allowedCategories: List[str] = Field(
        default=[
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
        ],
        description="Categories agent can recommend from",
    )
    agentEnabled: bool = Field(default=True, description="Whether the agent is enabled at all")
    requireConfirm: bool = Field(default=True, description="Require user confirmation for checkout")


class PolicyUpdateRequest(BaseModel):
    """Request to update user's policy."""
    maxSpend: Optional[float] = Field(None, ge=0)
    allowedCategories: Optional[List[str]] = None
    agentEnabled: Optional[bool] = None
    requireConfirm: Optional[bool] = None


class PolicyResponse(BaseModel):
    """Response containing the current policy."""
    userId: str
    policy: AgentPolicy
    updatedAt: Optional[str] = None
