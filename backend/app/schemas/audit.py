"""
Me-Agent Audit Schemas
Defines the AuditEvent model for transparency logging.
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Any, Literal
from .policy import AgentPolicy


class AuditEvent(BaseModel):
    """
    Represents a single auditable action.
    Every agent action + enforcement decision is logged.
    """
    id: str = Field(..., description="Unique event ID")
    ts: str = Field(..., description="ISO timestamp")
    actor: Literal["user", "agent"] = Field(default="agent", description="Who initiated the action")
    action: str = Field(..., description="The action attempted (cartCreate, recommendBundle, checkoutStart, etc.)")
    decision: Literal["ALLOW", "BLOCK"] = Field(..., description="Whether the action was allowed")
    reason: str = Field(..., description="Human-readable explanation of the decision")
    policySnapshot: AgentPolicy = Field(..., description="Policy at time of decision")
    meta: Optional[dict] = Field(default=None, description="Additional context (cartTotal, items, etc.)")


class AuditEventCreate(BaseModel):
    """Request to create a custom audit event."""
    actor: Literal["user", "agent"] = "agent"
    action: str
    decision: Literal["ALLOW", "BLOCK"]
    reason: str
    meta: Optional[dict] = None


class AuditLogResponse(BaseModel):
    """Response containing audit log entries."""
    userId: str
    events: List[AuditEvent]
    total: int
