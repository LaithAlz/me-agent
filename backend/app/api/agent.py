"""
Me-Agent Shopping Agent API Routes

Routes:
- GET  /agent/health
- POST /agent/recommend
- POST /agent/feedback
- POST /agent/debug/echo

Design goals:
- Single source of truth for config via app.core.config.get_settings()
- Works with MongoDB when MONGO_URI is set
- Falls back to in-memory persistence for hackathon demo if Mongo is missing
- Never leaks Backboard exceptions as raw 500s, converts them to HTTP 502 with JSON details
"""

from __future__ import annotations

import json
import os
import uuid
from datetime import datetime
from typing import Optional, Any, Dict, List

import pymongo
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from backboard import BackboardClient
from backboard.exceptions import BackboardNotFoundError
from backboard.exceptions import BackboardAPIError

from app.core.config import get_settings


# ============================================================
# Config
# ============================================================
settings = get_settings()

API_KEY = getattr(settings, "BACKBOARD_API_KEY", None) or os.getenv("BACKBOARD_API_KEY")
MONGO_URI = getattr(settings, "MONGO_URI", None) or os.getenv("MONGO_URI")
MONGO_DB_NAME = getattr(settings, "MONGO_DB_NAME", None) or os.getenv("MONGO_DB_NAME") or "meagent"

if not API_KEY:
    raise RuntimeError("Missing BACKBOARD_API_KEY")

# Backboard client
client = BackboardClient(api_key=API_KEY)

# Mongo optional, in-memory fallback for demo reliability
_mongo_client: Optional[pymongo.MongoClient] = None
_db = None

_memory_store: Dict[str, Any] = {
    "meta": {},         # key -> value
    "memory": {},       # user_id -> { memory, backboard_memory_id }
    "sessions": [],     # list of sessions
    "corrections": [],  # list of feedback
}

if MONGO_URI:
    _mongo_client = pymongo.MongoClient(MONGO_URI)
    _db = _mongo_client[MONGO_DB_NAME]

router = APIRouter(prefix="/agent", tags=["Agent"])


# ============================================================
# Schemas
# ============================================================
class Product(BaseModel):
    name: str
    price: float
    brand: str
    tags: list[str]


class RecommendationRequest(BaseModel):
    # backward compatible identifiers
    user_id: Optional[str] = None
    userId: Optional[str] = None

    # inventory
    products: list[Product]

    # legacy
    context: Optional[str] = "personal use"
    max_total: Optional[float] = 500

    # new frontend fields
    shoppingIntent: Optional[str] = None
    allowedCategories: Optional[list[str]] = None
    brandPreferences: Optional[list[str]] = None
    maxSpend: Optional[float] = None
    priceSensitivity: Optional[int] = None  # 1..5
    agentEnabled: Optional[bool] = True


class FeedbackRequest(BaseModel):
    user_id: str
    rejected_items: list[str]
    reason: str


# ============================================================
# Persistence helpers (Mongo or in-memory)
# ============================================================
def _db_get_meta(key: str) -> Optional[str]:
    if _db is not None:
        doc = _db.meta.find_one({"key": key})
        return doc.get("value") if doc else None
    return _memory_store["meta"].get(key)


def _db_set_meta(key: str, value: str) -> None:
    if _db is not None:
        _db.meta.update_one({"key": key}, {"$set": {"value": value}}, upsert=True)
        return
    _memory_store["meta"][key] = value


def _db_get_user_memory(user_id: str) -> Optional[dict]:
    if _db is not None:
        return _db.memory.find_one({"user_id": user_id})
    return _memory_store["memory"].get(user_id)


def _db_set_user_memory(user_id: str, memory_payload: dict, backboard_memory_id: Optional[str] = None) -> None:
    if _db is not None:
        update = {"memory": memory_payload}
        if backboard_memory_id:
            update["backboard_memory_id"] = backboard_memory_id
        _db.memory.update_one({"user_id": user_id}, {"$set": update}, upsert=True)
        return

    entry = _memory_store["memory"].get(user_id, {})
    entry["memory"] = memory_payload
    if backboard_memory_id:
        entry["backboard_memory_id"] = backboard_memory_id
    _memory_store["memory"][user_id] = entry


def _db_insert_session(user_id: str, cart: str, explanation: str) -> None:
    record = {
        "user_id": user_id,
        "cart": cart,
        "explanation": explanation,
        "timestamp": datetime.utcnow().isoformat(),
    }
    if _db is not None:
        _db.sessions.insert_one(record)
        return
    _memory_store["sessions"].append(record)


def _db_insert_correction(user_id: str, rejected: list[str], reason: str) -> None:
    record = {
        "user_id": user_id,
        "rejected": rejected,
        "reason": reason,
        "timestamp": datetime.utcnow().isoformat(),
    }
    if _db is not None:
        _db.corrections.insert_one(record)
        return
    _memory_store["corrections"].append(record)


# ============================================================
# Normalization helpers
# ============================================================
def _norm(s: Optional[str]) -> str:
    return (s or "").strip().lower()


def _normalize_user_id(req: RecommendationRequest) -> str:
    uid = req.user_id or req.userId
    if not uid or not uid.strip():
        raise HTTPException(status_code=422, detail="Missing user_id or userId")
    return uid.strip()


def _normalize_budget(req: RecommendationRequest) -> float:
    if req.maxSpend is not None:
        return float(req.maxSpend)
    if req.max_total is not None:
        return float(req.max_total)
    return 500.0


def _normalize_list(vals: Optional[list[str]]) -> list[str]:
    if not vals:
        return []
    out: list[str] = []
    for v in vals:
        nv = _norm(v)
        if nv:
            out.append(nv)
    return out


def _get_attr(obj: Any, *keys: str) -> Optional[Any]:
    """
    Backboard SDK objects sometimes return attribute objects or dict-like objects.
    This helper reads either style safely.
    """
    for k in keys:
        if hasattr(obj, k):
            return getattr(obj, k)
        if isinstance(obj, dict) and k in obj:
            return obj[k]
    return None


# ============================================================
# Memory helpers
# ============================================================
DEFAULT_POLICY = {
    "preferred_brands": ["Apple", "Bose", "Logitech"],
    "price_sensitivity": {"max_cart": 500},
    "rejection_patterns": ["rgb", "samsung", "flashy"],
    "weights": {"ecosystem_fit": 0.4, "design": 0.3, "price": 0.2},
}


def _default_memory(max_total: float) -> dict:
    mem = json.loads(json.dumps(DEFAULT_POLICY))
    mem["price_sensitivity"]["max_cart"] = float(max_total)
    return mem


def _apply_frontend_preferences_to_memory(memory_payload: dict, req: RecommendationRequest, budget: float) -> dict:
    if req.brandPreferences:
        existing = set(memory_payload.get("preferred_brands", []))
        for b in req.brandPreferences:
            if b and b.strip():
                existing.add(b.strip())
        memory_payload["preferred_brands"] = sorted(existing)

    memory_payload.setdefault("price_sensitivity", {})
    memory_payload["price_sensitivity"]["max_cart"] = float(budget)

    ps = req.priceSensitivity
    if isinstance(ps, int) and 1 <= ps <= 5:
        w = memory_payload.get("weights") or {"ecosystem_fit": 0.4, "design": 0.3, "price": 0.2}

        # Higher ps => higher price weight
        # ps=1 -> 0.15, ps=5 -> 0.40
        price_w = 0.15 + (ps - 1) * (0.25 / 4)
        price_w = max(0.10, min(0.60, price_w))

        remaining = 1.0 - price_w
        base_other = (w.get("ecosystem_fit", 0.4) + w.get("design", 0.3)) or 0.7

        w["price"] = round(price_w, 3)
        w["ecosystem_fit"] = round(remaining * (w.get("ecosystem_fit", 0.4) / base_other), 3)
        w["design"] = round(remaining * (w.get("design", 0.3) / base_other), 3)
        memory_payload["weights"] = w

    return memory_payload


def _filter_inventory_by_allowed_categories(products: list[Product], allowed_categories_norm: list[str]) -> list[Product]:
    """
    Deterministic enforcement without schema changes:
    - Treat allowedCategories as tags
    - Keep only products whose tags intersect allowedCategories
    - If none match, fall back to original inventory
    """
    if not allowed_categories_norm:
        return products

    allowed_set = set(allowed_categories_norm)
    filtered: list[Product] = []
    for p in products:
        tagset = set(_norm(t) for t in (p.tags or []))
        if tagset.intersection(allowed_set):
            filtered.append(p)

    return filtered if filtered else products


def _raise_backboard_502(stage: str, exc: BackboardAPIError) -> None:
    raise HTTPException(
        status_code=502,
        detail={
            "message": f"Backboard error during {stage}",
            "error": str(exc),
            "backboard_status": getattr(exc, "status_code", None),
        },
    )


async def _ensure_backboard_memory(assistant_id: str, user_id: str, memory_payload: dict) -> str:
    mem_doc = _db_get_user_memory(user_id) or {}
    existing_id = mem_doc.get("backboard_memory_id")

    content = json.dumps(memory_payload)

    if existing_id:
        try:
            await client.update_memory(
                assistant_id=assistant_id,
                memory_id=existing_id,
                content=content,
                metadata={"user_id": user_id, "type": "shopping_identity"},
            )
            _db_set_user_memory(user_id, memory_payload, backboard_memory_id=existing_id)
            return existing_id
        except BackboardNotFoundError:
            pass
        except BackboardAPIError as e:
            _raise_backboard_502("update_memory", e)

    try:
        created = await client.add_memory(
            assistant_id=assistant_id,
            content=content,
            metadata={"user_id": user_id, "type": "shopping_identity"},
        )
    except BackboardAPIError as e:
        _raise_backboard_502("add_memory", e)

    new_id = _get_attr(created, "memory_id", "id")
    if not new_id:
        raise HTTPException(status_code=502, detail={"message": "Backboard add_memory returned no memory_id", "raw": created})

    _db_set_user_memory(user_id, memory_payload, backboard_memory_id=str(new_id))
    return str(new_id)


def _get_assistant_id() -> str:
    assistant_id = _db_get_meta("assistant_id")
    if not assistant_id:
        raise HTTPException(status_code=500, detail="Assistant not initialized")
    return assistant_id


# ============================================================
# Startup
# ============================================================
async def startup() -> None:
    """
    Call once from FastAPI lifespan startup.
    Persists assistant_id into meta storage.
    """
    existing = _db_get_meta("assistant_id")
    if existing:
        return

    try:
        assistant = await client.create_assistant(
            name="LaithReplica",
            description=(
                "You are a decision-making shopping agent.\n"
                "Prioritize ecosystem fit, minimalism, ergonomic value.\n"
                "Reject flashy designs, unknown brands, anything previously rejected.\n"
                "After selecting a cart, explain the reasoning."
            ),
        )
    except BackboardAPIError as e:
        _raise_backboard_502("create_assistant", e)

    assistant_id = _get_attr(assistant, "assistant_id", "id")
    if not assistant_id:
        raise HTTPException(status_code=502, detail={"message": "Backboard create_assistant returned no assistant_id", "raw": assistant})

    _db_set_meta("assistant_id", str(assistant_id))


# ============================================================
# Routes
# ============================================================
@router.get("/health")
async def health():
    return {"ok": True, "mongo": bool(_db is not None), "dbName": MONGO_DB_NAME}


@router.post("/recommend")
async def recommend(req: RecommendationRequest):
    assistant_id = _get_assistant_id()

    user_id = _normalize_user_id(req)
    budget = _normalize_budget(req)

    # Load memory or default
    mem_doc = _db_get_user_memory(user_id) or {}
    memory_payload = mem_doc.get("memory") or _default_memory(max_total=budget)

    # Apply frontend signals (persistent)
    memory_payload = _apply_frontend_preferences_to_memory(memory_payload, req, budget)

    # Sync to Backboard memory
    await _ensure_backboard_memory(assistant_id, user_id, memory_payload)

    # Agent disabled => deterministic response
    if req.agentEnabled is False:
        empty = {"items": [], "total": 0.0, "notes": "Agent disabled by user."}
        return JSONResponse(
            content={
                "cart": json.dumps(empty),
                "explanation": "Agent is disabled. Enable it to generate recommendations.",
            }
        )

    # Intent text
    intent_text = (req.shoppingIntent or "").strip()
    context_text = (req.context or "").strip()
    intent = intent_text or context_text or "personal use"

    # Normalize session inputs
    allowed_norm = _normalize_list(req.allowedCategories)
    preferred_norm = _normalize_list(req.brandPreferences)

    # Session override: preferred brands win over avoid for this run
    raw_avoid = memory_payload.get("rejection_patterns", []) or []
    avoid_norm = [_norm(x) for x in raw_avoid if _norm(x)]
    avoid_norm = [x for x in avoid_norm if x not in set(preferred_norm)]

    # Deterministic category filtering using tags
    inventory_filtered = _filter_inventory_by_allowed_categories(req.products, allowed_norm)

    # Create Backboard thread
    try:
        thread = await client.create_thread(assistant_id)
    except BackboardAPIError as e:
        _raise_backboard_502("create_thread", e)

    thread_id = _get_attr(thread, "thread_id", "id")
    if not thread_id:
        raise HTTPException(status_code=502, detail={"message": "Backboard create_thread returned no thread_id", "raw": thread})

    decision_prompt = {
        "task": "Select a cart from inventory that best matches intent and preferences while respecting constraints.",
        "intent": intent,
        "constraints": {
            "max_total": budget,
            "allowed_categories": req.allowedCategories or [],
            "brand_preferences": req.brandPreferences or [],
            "price_sensitivity": req.priceSensitivity,
            "avoid": avoid_norm,
            "hard_rules": [
                "Return ONLY valid JSON. No markdown, no extra text.",
                "If allowed_categories is non-empty, ONLY choose items whose tags include at least one allowed category token.",
                "If a brand appears in both brand_preferences and avoid, brand_preferences wins for this run.",
                "Reject unknown brands, RGB, flashy items, anything in avoid.",
            ],
            "notes_rule": "notes should be 1-2 sentences max",
            "output_format": {
                "type": "json_only",
                "schema": {
                    "items": [{"name": "string", "brand": "string", "price": "number", "tags": ["string"]}],
                    "total": "number",
                    "notes": "string",
                },
            },
        },
        "inventory": [p.dict() for p in inventory_filtered],
    }

    try:
        decision = await client.add_message(
            thread_id=str(thread_id),
            content=json.dumps(decision_prompt),
            llm_provider="openai",
            model_name="gpt-4.1",
            memory="Auto",
            stream=False,
        )
    except BackboardAPIError as e:
        _raise_backboard_502("add_message decision", e)

    decision_content = _get_attr(decision, "content") or ""
    if not isinstance(decision_content, str):
        decision_content = str(decision_content)

    explain_prompt = {
        "task": "Explain the chosen cart to the user in plain language.",
        "intent": intent,
        "constraints": {
            "max_total": budget,
            "allowed_categories": req.allowedCategories or [],
            "brand_preferences": req.brandPreferences or [],
            "price_sensitivity": req.priceSensitivity,
            "avoid": avoid_norm,
        },
        "guidelines": [
            "Do not mention internal memory IDs or labels like 'Memory 1'.",
            "If intent conflicts with allowed categories, reinterpret intent within allowed categories and state that assumption briefly.",
            "If a brand appears in both brand_preferences and avoid, treat brand_preferences as the session override for this run.",
            "Structure: summary, constraints followed, why other items were rejected, how it matches preferences.",
        ],
        "cart_reference": "Use the latest decision in this thread as the chosen cart.",
    }

    try:
        explanation = await client.add_message(
            thread_id=str(thread_id),
            content=json.dumps(explain_prompt),
            llm_provider="openai",
            model_name="gpt-5-mini",
            memory="Auto",
            stream=False,
        )
    except BackboardAPIError as e:
        _raise_backboard_502("add_message explanation", e)

    explanation_content = _get_attr(explanation, "content") or ""
    if not isinstance(explanation_content, str):
        explanation_content = str(explanation_content)

    _db_insert_session(user_id=user_id, cart=decision_content, explanation=explanation_content)

    return JSONResponse(content={"cart": decision_content, "explanation": explanation_content})


@router.post("/feedback")
async def record_feedback(req: FeedbackRequest):
    _db_insert_correction(user_id=req.user_id, rejected=req.rejected_items, reason=req.reason)

    mem_doc = _db_get_user_memory(req.user_id) or {}
    memory_payload = mem_doc.get("memory") or _default_memory(max_total=500)

    updated = sorted(set((memory_payload.get("rejection_patterns", []) or []) + req.rejected_items))
    memory_payload["rejection_patterns"] = updated

    # persist locally
    existing_backboard_id = mem_doc.get("backboard_memory_id")
    _db_set_user_memory(req.user_id, memory_payload, backboard_memory_id=existing_backboard_id)

    # sync to Backboard
    assistant_id = _get_assistant_id()
    await _ensure_backboard_memory(assistant_id, req.user_id, memory_payload)

    return {"status": "updated"}


@router.post("/debug/echo")
async def echo(req: RecommendationRequest):
    return req.dict()
