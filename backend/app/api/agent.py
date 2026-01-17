import os
import json
from datetime import datetime
from typing import Optional

import pymongo
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from backboard import BackboardClient
from backboard.exceptions import BackboardNotFoundError


# --------------------------
# Config
# --------------------------
load_dotenv()
API_KEY = os.getenv("BACKBOARD_API_KEY")
MONGO_URI = os.getenv("MONGO_URI")

if not API_KEY:
    raise RuntimeError("Missing BACKBOARD_API_KEY")
if not MONGO_URI:
    raise RuntimeError("Missing MONGO_URI")

DECISION_PROVIDER = "openai"
DECISION_MODEL = "gpt-4.1"
EXPLAIN_PROVIDER = "openai"
EXPLAIN_MODEL = "gpt-5-mini"

client = BackboardClient(api_key=API_KEY)
mongo = pymongo.MongoClient(MONGO_URI)
db = mongo["backboard_shopper"]


# --------------------------
# Schemas
# --------------------------
class Product(BaseModel):
    name: str
    price: float
    brand: str
    tags: list[str]


class RecommendationRequest(BaseModel):
    # Backward compatible identifiers
    user_id: Optional[str] = None
    userId: Optional[str] = None

    # Inventory
    products: list[Product]

    # Legacy fields (still accepted)
    context: Optional[str] = "personal use"
    max_total: Optional[float] = 500

    # New frontend fields
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


# --------------------------
# App + CORS
# --------------------------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------
# Helpers
# --------------------------
def _norm(s: Optional[str]) -> str:
    return (s or "").strip().lower()


def _normalize_user_id(req: RecommendationRequest) -> str:
    uid = req.user_id or req.userId
    if not uid or not uid.strip():
        raise HTTPException(status_code=422, detail="Missing user_id/userId")
    return uid.strip()


def _normalize_budget(req: RecommendationRequest) -> float:
    if req.maxSpend is not None:
        return float(req.maxSpend)
    if req.max_total is not None:
        return float(req.max_total)
    return 500.0


def _default_memory(max_total: float) -> dict:
    return {
        "preferred_brands": ["Apple", "Bose", "Logitech"],
        "price_sensitivity": {"max_cart": max_total},
        "rejection_patterns": ["RGB", "Samsung", "flashy"],
        "weights": {"ecosystem_fit": 0.4, "design": 0.3, "price": 0.2},
    }


def _apply_frontend_preferences_to_memory(memory_payload: dict, req: RecommendationRequest, budget: float) -> dict:
    """
    Important precedence rule:
    - We DO store brandPreferences into preferred_brands (optional)
    - We DO NOT remove rejections here
    - Session-level override (brandPreferences overrides avoid) is handled in /recommend only
    """
    if req.brandPreferences:
        existing = set(memory_payload.get("preferred_brands", []))
        for b in req.brandPreferences:
            if b and b.strip():
                existing.add(b.strip())
        memory_payload["preferred_brands"] = sorted(existing)

    memory_payload.setdefault("price_sensitivity", {})
    memory_payload["price_sensitivity"]["max_cart"] = budget

    ps = req.priceSensitivity
    if isinstance(ps, int) and 1 <= ps <= 5:
        w = memory_payload.get("weights", {"ecosystem_fit": 0.4, "design": 0.3, "price": 0.2})

        # Higher ps => more price weight
        # ps=1 -> 0.40, ps=5 -> 0.15
        price_w = 0.40 - (ps - 1) * (0.25 / 4)
        price_w = max(0.10, min(0.60, price_w))

        remaining = 1.0 - price_w
        base_other = (w.get("ecosystem_fit", 0.4) + w.get("design", 0.3)) or 0.7

        w["price"] = round(price_w, 3)
        w["ecosystem_fit"] = round(remaining * (w.get("ecosystem_fit", 0.4) / base_other), 3)
        w["design"] = round(remaining * (w.get("design", 0.3) / base_other), 3)

        memory_payload["weights"] = w

    return memory_payload


def _normalize_list(vals: Optional[list[str]]) -> list[str]:
    if not vals:
        return []
    out = []
    for v in vals:
        nv = _norm(v)
        if nv:
            out.append(nv)
    return out


def _filter_inventory_by_allowed_categories(products: list[Product], allowed_categories_norm: list[str]) -> list[Product]:
    """
    Deterministic category enforcement without schema changes:
    - Treat allowedCategories as tags
    - Keep only products whose tags intersect allowedCategories
    - If no products match, fall back to original inventory (so you do not get empty lists due to tagging mismatch)
    """
    if not allowed_categories_norm:
        return products

    filtered: list[Product] = []
    for p in products:
        tagset = set(_norm(t) for t in (p.tags or []))
        if tagset.intersection(set(allowed_categories_norm)):
            filtered.append(p)

    return filtered if filtered else products


async def _ensure_backboard_memory(assistant_id: str, user_id: str, memory_payload: dict) -> str:
    mem_doc = db.memory.find_one({"user_id": user_id})
    existing_id = mem_doc.get("backboard_memory_id") if mem_doc else None

    content = json.dumps(memory_payload)

    if existing_id:
        try:
            await client.update_memory(
                assistant_id=assistant_id,
                memory_id=existing_id,
                content=content,
                metadata={"user_id": user_id, "type": "shopping_identity"},
            )
            db.memory.update_one(
                {"user_id": user_id},
                {"$set": {"memory": memory_payload}},
                upsert=True,
            )
            return existing_id
        except BackboardNotFoundError:
            pass

    created = await client.add_memory(
        assistant_id=assistant_id,
        content=content,
        metadata={"user_id": user_id, "type": "shopping_identity"},
    )

    new_id = created.get("memory_id") or created.get("id")
    if not new_id:
        raise HTTPException(status_code=500, detail=f"Backboard add_memory returned no memory_id: {created}")

    db.memory.update_one(
        {"user_id": user_id},
        {"$set": {"memory": memory_payload, "backboard_memory_id": new_id}},
        upsert=True,
    )
    return new_id


def _get_assistant_id() -> str:
    doc = db.meta.find_one({"key": "assistant_id"})
    if not doc or "value" not in doc:
        raise HTTPException(status_code=500, detail="Assistant not initialized")
    return doc["value"]


# --------------------------
# Startup
# --------------------------
@app.on_event("startup")
async def setup_assistant():
    if not db.meta.find_one({"key": "assistant_id"}):
        assistant = await client.create_assistant(
            name="LaithReplica",
            description=(
                "You are a decision-making agent based on Laith's shopping history.\n"
                "Prioritize ecosystem fit, minimalism and ergonomic value.\n"
                "Reject products with flashy designs or unknown brands.\n"
                "After selecting a cart, explain the reasoning."
            ),
        )
        db.meta.insert_one({"key": "assistant_id", "value": assistant.assistant_id})
    else:
        print("Assistant already set up")


# --------------------------
# Routes
# --------------------------
@app.post("/recommend")
async def recommend(req: RecommendationRequest):
    assistant_id = _get_assistant_id()
    thread = await client.create_thread(assistant_id)

    user_id = _normalize_user_id(req)
    budget = _normalize_budget(req)

    # Load memory or defaults
    mem_doc = db.memory.find_one({"user_id": user_id})
    memory_payload = mem_doc["memory"] if mem_doc and "memory" in mem_doc else _default_memory(max_total=budget)

    # Patch memory with frontend signals (persistent)
    memory_payload = _apply_frontend_preferences_to_memory(memory_payload, req, budget)

    # Sync to Backboard + DB
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

    # Build intent text
    intent_text = (req.shoppingIntent or "").strip()
    context_text = (req.context or "").strip()
    intent = intent_text or context_text or "personal use"

    # Normalize session inputs
    allowed_norm = _normalize_list(req.allowedCategories)
    preferred_norm = _normalize_list(req.brandPreferences)

    # Session override rule:
    # If a brand is explicitly preferred this run, do not treat it as avoided for this run
    raw_avoid = memory_payload.get("rejection_patterns", []) or []
    avoid_norm = [_norm(x) for x in raw_avoid if _norm(x)]
    avoid_norm = [x for x in avoid_norm if x not in set(preferred_norm)]

    # Deterministic category filtering using tags
    inventory_filtered = _filter_inventory_by_allowed_categories(req.products, allowed_norm)

    decision_prompt = {
        "task": "Select a cart from inventory that best matches the user's intent and preferences while respecting constraints.",
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
                "Reject unknown brands, RGB, flashy items, and anything in avoid.",
            ],
            "notes_rule": "notes should be 1-2 sentences max, no long explanation",
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

    decision = await client.add_message(
        thread_id=thread.thread_id,
        content=json.dumps(decision_prompt),
        llm_provider=DECISION_PROVIDER,
        model_name=DECISION_MODEL,
        memory="Auto",
        stream=False,
    )

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
            "If intent conflicts with allowed categories, reinterpret the intent within the allowed categories and state that assumption briefly.",
            "If a brand appears in both brand_preferences and avoid, treat brand_preferences as the session override for this run.",
            "Structure: summary, constraints followed, why other items were rejected, how it matches preferences.",
        ],
        "cart_reference": "Use the latest decision in this thread as the chosen cart.",
    }

    explanation = await client.add_message(
        thread_id=thread.thread_id,
        content=json.dumps(explain_prompt),
        llm_provider=EXPLAIN_PROVIDER,
        model_name=EXPLAIN_MODEL,
        memory="Auto",
        stream=False,
    )

    db.sessions.insert_one(
        {
            "user_id": user_id,
            "cart": decision.content,
            "explanation": explanation.content,
            "timestamp": datetime.utcnow(),
        }
    )

    return JSONResponse(content={"cart": decision.content, "explanation": explanation.content})


@app.post("/feedback")
async def record_feedback(req: FeedbackRequest):
    db.corrections.insert_one(
        {
            "user_id": req.user_id,
            "rejected": req.rejected_items,
            "reason": req.reason,
            "timestamp": datetime.utcnow(),
        }
    )

    mem_doc = db.memory.find_one({"user_id": req.user_id})
    memory_payload = (mem_doc.get("memory") if mem_doc else None) or _default_memory(max_total=500)

    # Persist rejections as history (do not do precedence logic here)
    updated = sorted(set(memory_payload.get("rejection_patterns", []) + req.rejected_items))
    memory_payload["rejection_patterns"] = updated

    db.memory.update_one(
        {"user_id": req.user_id},
        {"$set": {"memory": memory_payload}},
        upsert=True,
    )

    assistant_id = _get_assistant_id()
    await _ensure_backboard_memory(assistant_id, req.user_id, memory_payload)

    return {"status": "updated"}


@app.post("/debug/echo")
async def echo(req: RecommendationRequest):
    return req.dict()
