"""
Me-Agent Database Client
Provides MongoDB connection with in-memory fallback for hackathon demo.
"""
import os
from typing import Optional, Dict, List, Any
from datetime import datetime
import uuid
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from .config import get_settings

# Global database client
_mongo_client: Optional[AsyncIOMotorClient] = None
_db: Optional[AsyncIOMotorDatabase] = None

# In-memory fallback storage (for demo when MongoDB unavailable)
_memory_store: Dict[str, Dict[str, List[Any]]] = {
    "users": {},       # userId -> user data
    "credentials": {}, # credentialId -> credential data
    "policies": {},    # userId -> policy
    "audit_logs": {},  # userId -> list of events
    "avatars": {},     # userId -> avatar data
}


async def init_db() -> bool:
    """
    Initialize MongoDB connection. Returns True if connected, False if using memory fallback.
    """
    global _mongo_client, _db
    settings = get_settings()
    
    if settings.MONGODB_URI:
        try:
            _mongo_client = AsyncIOMotorClient(settings.MONGODB_URI)
            _db = _mongo_client[settings.MONGODB_DB_NAME]
            # Test connection
            await _mongo_client.admin.command('ping')
            print(f"✅ Connected to MongoDB: {settings.MONGODB_DB_NAME}")
            return True
        except Exception as e:
            print(f"⚠️ MongoDB connection failed: {e}")
            print("📦 Falling back to in-memory storage")
            _mongo_client = None
            _db = None
            return False
    else:
        print("📦 No MONGODB_URI set, using in-memory storage")
        return False


async def close_db():
    """Close MongoDB connection."""
    global _mongo_client
    if _mongo_client:
        _mongo_client.close()
        _mongo_client = None


def get_db() -> Optional[AsyncIOMotorDatabase]:
    """Get the database instance (None if using memory fallback)."""
    return _db


def is_using_mongo() -> bool:
    """Check if we're connected to MongoDB."""
    return _db is not None


# ============================================================
# User & Credential Storage (for WebAuthn)
# ============================================================

async def save_user(user_id: str, username: str, display_name: str) -> dict:
    """Save a new user."""
    user_data = {
        "id": user_id,
        "username": username,
        "displayName": display_name,
        "createdAt": datetime.utcnow().isoformat(),
    }
    
    if _db is not None:
        await _db.users.update_one(
            {"id": user_id},
            {"$set": user_data},
            upsert=True
        )
    else:
        _memory_store["users"][user_id] = user_data
    
    return user_data


async def get_user_by_username(username: str) -> Optional[dict]:
    """Find user by username."""
    if _db is not None:
        return await _db.users.find_one({"username": username})
    else:
        for user in _memory_store["users"].values():
            if user.get("username") == username:
                return user
        return None


async def get_user_by_id(user_id: str) -> Optional[dict]:
    """Find user by ID."""
    if _db is not None:
        return await _db.users.find_one({"id": user_id})
    else:
        return _memory_store["users"].get(user_id)


async def save_credential(user_id: str, credential_data: dict):
    """Save a WebAuthn credential for a user."""
    credential_data["userId"] = user_id
    credential_data["createdAt"] = datetime.utcnow().isoformat()
    
    if _db is not None:
        await _db.credentials.insert_one(credential_data)
    else:
        cred_id = credential_data.get("credentialId", str(uuid.uuid4()))
        _memory_store["credentials"][cred_id] = credential_data


async def get_credentials_for_user(user_id: str) -> List[dict]:
    """Get all credentials for a user."""
    if _db is not None:
        cursor = _db.credentials.find({"userId": user_id})
        return await cursor.to_list(length=100)
    else:
        return [c for c in _memory_store["credentials"].values() if c.get("userId") == user_id]


async def get_credential_by_id(credential_id: str) -> Optional[dict]:
    """Find credential by ID."""
    if _db is not None:
        return await _db.credentials.find_one({"credentialId": credential_id})
    else:
        return _memory_store["credentials"].get(credential_id)


# ============================================================
# Policy Storage
# ============================================================

DEFAULT_POLICY = {
    "maxSpend": 150,
    "allowedCategories": ["office", "electronics"],
    "agentEnabled": True,
    "requireConfirm": True,
}


async def get_policy(user_id: str) -> dict:
    """Get policy for user, returns default if none exists."""
    if _db is not None:
        policy = await _db.policies.find_one({"userId": user_id})
        if policy:
            policy.pop("_id", None)
            return policy
        return {"userId": user_id, **DEFAULT_POLICY}
    else:
        return _memory_store["policies"].get(user_id, {"userId": user_id, **DEFAULT_POLICY})


async def save_policy(user_id: str, policy: dict) -> dict:
    """Save/update policy for user."""
    policy_data = {
        "userId": user_id,
        "maxSpend": policy.get("maxSpend", DEFAULT_POLICY["maxSpend"]),
        "allowedCategories": policy.get("allowedCategories", DEFAULT_POLICY["allowedCategories"]),
        "agentEnabled": policy.get("agentEnabled", DEFAULT_POLICY["agentEnabled"]),
        "requireConfirm": policy.get("requireConfirm", DEFAULT_POLICY["requireConfirm"]),
        "updatedAt": datetime.utcnow().isoformat(),
    }
    
    if _db is not None:
        await _db.policies.update_one(
            {"userId": user_id},
            {"$set": policy_data},
            upsert=True
        )
    else:
        _memory_store["policies"][user_id] = policy_data
    
    return policy_data


# ============================================================
# Audit Log Storage
# ============================================================

async def add_audit_event(user_id: str, event: dict) -> dict:
    """Add an audit event for a user."""
    event_data = {
        "id": event.get("id", f"evt_{uuid.uuid4().hex[:12]}"),
        "userId": user_id,
        "ts": event.get("ts", datetime.utcnow().isoformat()),
        "actor": event.get("actor", "agent"),
        "action": event.get("action"),
        "decision": event.get("decision"),
        "reason": event.get("reason"),
        "policySnapshot": event.get("policySnapshot"),
        "meta": event.get("meta", {}),
    }
    
    if _db is not None:
        await _db.audit_logs.insert_one(event_data)
    else:
        if user_id not in _memory_store["audit_logs"]:
            _memory_store["audit_logs"][user_id] = []
        _memory_store["audit_logs"][user_id].append(event_data)
    
    return event_data


async def get_audit_logs(user_id: str, limit: int = 50) -> List[dict]:
    """Get audit logs for a user, most recent first."""
    if _db is not None:
        cursor = _db.audit_logs.find({"userId": user_id}).sort("ts", -1).limit(limit)
        logs = await cursor.to_list(length=limit)
        for log in logs:
            log.pop("_id", None)
        return logs
    else:
        logs = _memory_store["audit_logs"].get(user_id, [])
        return sorted(logs, key=lambda x: x.get("ts", ""), reverse=True)[:limit]


# ============================================================
# Avatar Storage
# ============================================================

async def save_avatar(user_id: str, avatar_data: str, style: str = "bitmoji") -> dict:
    """Save generated avatar for user."""
    data = {
        "userId": user_id,
        "avatar": avatar_data,  # Base64 image or URL
        "style": style,
        "createdAt": datetime.utcnow().isoformat(),
    }
    
    if _db is not None:
        await _db.avatars.update_one(
            {"userId": user_id},
            {"$set": data},
            upsert=True
        )
    else:
        _memory_store["avatars"][user_id] = data
    
    return data


async def get_avatar(user_id: str) -> Optional[dict]:
    """Get avatar for user."""
    if _db is not None:
        avatar = await _db.avatars.find_one({"userId": user_id})
        if avatar:
            avatar.pop("_id", None)
        return avatar
    else:
        return _memory_store["avatars"].get(user_id)
