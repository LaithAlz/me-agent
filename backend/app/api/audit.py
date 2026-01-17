"""
Me-Agent Audit API Routes
Provides transparency through audit logging.
"""
import uuid
from datetime import datetime
from fastapi import APIRouter, Cookie, Query
from typing import Optional

from ..core.db import get_audit_logs, add_audit_event, get_policy
from ..schemas.policy import AgentPolicy
from ..schemas.audit import AuditEvent, AuditEventCreate, AuditLogResponse

router = APIRouter(prefix="/audit", tags=["Audit"])

DEFAULT_DEMO_USER = "demo-user-1"


def get_user_id(meagent_user: Optional[str]) -> str:
    return meagent_user or DEFAULT_DEMO_USER


@router.get("", response_model=AuditLogResponse)
async def get_audit_log(
    limit: int = Query(default=50, ge=1, le=200),
    meagent_user: Optional[str] = Cookie(None),
):
    """
    Get audit log for the signed-in user.
    Returns events in reverse chronological order (most recent first).
    """
    user_id = get_user_id(meagent_user)
    
    logs = await get_audit_logs(user_id, limit=limit)
    
    # Convert to AuditEvent models
    events = []
    for log in logs:
        try:
            # Handle policySnapshot which might be dict or already AgentPolicy
            policy_snapshot = log.get("policySnapshot", {})
            if isinstance(policy_snapshot, dict):
                policy = AgentPolicy(**policy_snapshot)
            else:
                policy = policy_snapshot
            
            events.append(AuditEvent(
                id=log.get("id", "unknown"),
                ts=log.get("ts", datetime.utcnow().isoformat()),
                actor=log.get("actor", "agent"),
                action=log.get("action", "unknown"),
                decision=log.get("decision", "ALLOW"),
                reason=log.get("reason", ""),
                policySnapshot=policy,
                meta=log.get("meta"),
            ))
        except Exception as e:
            # Skip malformed events
            print(f"Skipping malformed audit event: {e}")
            continue
    
    return AuditLogResponse(
        userId=user_id,
        events=events,
        total=len(events),
    )


@router.post("", response_model=AuditEvent)
async def create_audit_event(
    event_create: AuditEventCreate,
    meagent_user: Optional[str] = Cookie(None),
):
    """
    Create a custom audit event.
    This is optional - /api/authority/check creates events automatically.
    Use this for custom user actions that should be logged.
    """
    user_id = get_user_id(meagent_user)
    
    # Get current policy for snapshot
    policy_data = await get_policy(user_id)
    policy = AgentPolicy(
        maxSpend=policy_data.get("maxSpend", 150),
        allowedCategories=policy_data.get("allowedCategories", ["office"]),
        agentEnabled=policy_data.get("agentEnabled", True),
        requireConfirm=policy_data.get("requireConfirm", True),
    )
    
    event_id = f"evt_{uuid.uuid4().hex[:12]}"
    
    event_data = await add_audit_event(user_id, {
        "id": event_id,
        "ts": datetime.utcnow().isoformat(),
        "actor": event_create.actor,
        "action": event_create.action,
        "decision": event_create.decision,
        "reason": event_create.reason,
        "policySnapshot": policy.model_dump(),
        "meta": event_create.meta,
    })
    
    return AuditEvent(
        id=event_data["id"],
        ts=event_data["ts"],
        actor=event_data["actor"],
        action=event_data["action"],
        decision=event_data["decision"],
        reason=event_data["reason"],
        policySnapshot=policy,
        meta=event_data.get("meta"),
    )


@router.get("/summary")
async def audit_summary(meagent_user: Optional[str] = Cookie(None)):
    """
    Get a summary of audit activity.
    Useful for dashboard displays.
    """
    user_id = get_user_id(meagent_user)
    
    logs = await get_audit_logs(user_id, limit=100)
    
    # Calculate stats
    total = len(logs)
    allowed = sum(1 for log in logs if log.get("decision") == "ALLOW")
    blocked = sum(1 for log in logs if log.get("decision") == "BLOCK")
    
    # Get most recent
    recent = logs[0] if logs else None
    
    # Count by action type
    action_counts: dict[str, int] = {}
    for log in logs:
        action = log.get("action", "unknown")
        action_counts[action] = action_counts.get(action, 0) + 1
    
    return {
        "userId": user_id,
        "total": total,
        "allowed": allowed,
        "blocked": blocked,
        "blockRate": round(blocked / total * 100, 1) if total > 0 else 0,
        "mostRecent": recent,
        "actionCounts": action_counts,
    }
