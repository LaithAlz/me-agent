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
- Models are not hardcoded, configured via env or Settings
- Learns from both rejected items and kept items across sessions
- Explanation is best-effort: timeouts return cart with a deterministic fallback explanation
"""

from __future__ import annotations

import asyncio
import json
import os
from datetime import datetime
from typing import Optional, Any, Dict, List

import pymongo
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from backboard import BackboardClient
from backboard.exceptions import BackboardNotFoundError, BackboardAPIError

from app.core.config import get_settings
from app.schemas.bundle import BundleRequest, BundleItem, BundleResult, ExplainRequest, ExplainResult
from app.api.shopify import PRODUCTS, PURCHASE_HISTORY


# ============================================================
# Config
# ============================================================
settings = get_settings()

API_KEY = getattr(settings, "BACKBOARD_API_KEY", None) or os.getenv("BACKBOARD_API_KEY")

MONGO_URI = getattr(settings, "MONGO_URI", None) or os.getenv("MONGO_URI")
MONGO_DB_NAME = (
    getattr(settings, "MONGO_DB_NAME", None)
    or os.getenv("MONGO_DB_NAME")
    or getattr(settings, "MONGODB_DB_NAME", None)
    or os.getenv("MONGODB_DB_NAME")
    or "meagent"
)

# Backboard LLM routing (dynamic, not hardcoded)
DECISION_PROVIDER = getattr(settings, "DECISION_PROVIDER", None) or os.getenv("DECISION_PROVIDER") or "openai"
DECISION_MODEL = getattr(settings, "DECISION_MODEL", None) or os.getenv("DECISION_MODEL") or "gpt-4.1"

EXPLAIN_PROVIDER = getattr(settings, "EXPLAIN_PROVIDER", None) or os.getenv("EXPLAIN_PROVIDER") or "openai"
EXPLAIN_MODEL = getattr(settings, "EXPLAIN_MODEL", None) or os.getenv("EXPLAIN_MODEL") or "gpt-5-mini"

# Timeout controls
DECISION_TIMEOUT_S = float(getattr(settings, "DECISION_TIMEOUT_S", None) or os.getenv("BACKBOARD_DECISION_TIMEOUT_S") or 30)
EXPLAIN_TIMEOUT_S = float(getattr(settings, "EXPLAIN_TIMEOUT_S", None) or os.getenv("BACKBOARD_EXPLAIN_TIMEOUT_S") or 20)

if not API_KEY:
    raise RuntimeError("Missing BACKBOARD_API_KEY")

client = BackboardClient(api_key=API_KEY)

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


@router.post("/bundle", response_model=BundleResult)
def generate_bundle(payload: BundleRequest) -> BundleResult:
	if not payload.agentEnabled:
		return BundleResult(items=[], subtotal=0.0, currency="USD")

	persona_id = payload.personaId or "alex"
	past_purchases = PURCHASE_HISTORY.get(persona_id, [])
	past_vendors = {_normalize(p.vendor) for p in past_purchases}
	past_products = {p.productId for p in past_purchases}
	brand_prefs = {_normalize(b) for b in payload.brandPreferences}
	cart_quantities = {item.id: item.qty for item in (payload.cartItems or [])}

	allowed_categories = {_normalize(c) for c in payload.allowedCategories}
	def remaining_stock(product) -> int:
		return max((product.stockQuantity or 0) - cart_quantities.get(product.id, 0), 0)

	available = [
		p
		for p in PRODUCTS
		if _normalize(p.productType) in allowed_categories and remaining_stock(p) > 0
	]

	def score_product(product) -> tuple:
		vendor_norm = _normalize(product.vendor)
		brand_pref = vendor_norm in brand_prefs or any(
			pref in vendor_norm or pref in _normalize(product.title) for pref in brand_prefs
		)
		past_brand = vendor_norm in past_vendors
		past_item = product.id in past_products
		score = 0
		if brand_pref:
			score += 3
		if past_brand:
			score += 2
		if past_item:
			score += 1
		price = product.variants[0].price
		return (-score, price, product.id)

	sorted_candidates = sorted(available, key=score_product)
	sorted_by_price = sorted(available, key=lambda p: (p.variants[0].price, p.id))

	selected_items: List[BundleItem] = []
	subtotal = 0.0

	def add_product(product) -> bool:
		nonlocal subtotal
		price = product.variants[0].price
		if subtotal + price > payload.maxSpend:
			return False
		vendor_norm = _normalize(product.vendor)
		brand_pref = vendor_norm in brand_prefs or any(
			pref in vendor_norm or pref in _normalize(product.title) for pref in brand_prefs
		)
		past_brand = vendor_norm in past_vendors
		past_item = product.id in past_products
		reason_tags = _build_reason_tags(
			base_tags=["Matches category", "Within budget"],
			brand_pref=brand_pref,
			past_brand=past_brand,
			past_item=past_item,
		)
		selected_items.append(
			BundleItem(
				id=product.id,
				title=product.title,
				price=price,
				category=product.productType,
				merchant=product.vendor,
				reasonTags=reason_tags,
				qty=1,
				stockQuantity=product.stockQuantity,
				imageUrl=product.images[0] if product.images else None,
			)
		)
		subtotal = round(subtotal + price, 2)
		return True

	for product in sorted_candidates:
		if len(selected_items) >= 6:
			break
		add_product(product)

	if len(selected_items) < 3:
		for product in sorted_by_price:
			if len(selected_items) >= 3:
				break
			if any(item.id == product.id for item in selected_items):
				continue
			add_product(product)

	return BundleResult(items=selected_items, subtotal=subtotal, currency="USD")
class FeedbackRequest(BaseModel):
    user_id: str
    rejected_items: list[str]
    kept_items: Optional[list[str]] = None  # optional
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


def _db_insert_session(user_id: str, cart: str, explanation: str, inventory: list[dict]) -> None:
    record = {
        "user_id": user_id,
        "cart": cart,
        "explanation": explanation,
        "inventory": inventory,  # snapshot for feedback learning
        "timestamp": datetime.utcnow().isoformat(),
    }
    if _db is not None:
        _db.sessions.insert_one(record)
        return
    _memory_store["sessions"].append(record)


def _db_get_latest_session(user_id: str) -> Optional[dict]:
    if _db is not None:
        return _db.sessions.find_one({"user_id": user_id}, sort=[("timestamp", pymongo.DESCENDING)])
    sessions = [s for s in _memory_store["sessions"] if s.get("user_id") == user_id]
    if not sessions:
        return None
    return sorted(sessions, key=lambda x: x.get("timestamp", ""), reverse=True)[0]


def _db_insert_correction(user_id: str, rejected: list[str], kept: list[str], reason: str) -> None:
    record = {
        "user_id": user_id,
        "rejected": rejected,
        "kept": kept,
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


def _normalize(s: Optional[str]) -> str:
    return _norm(s)


def _build_reason_tags(
    base_tags: list[str],
    brand_pref: bool,
    past_brand: bool,
    past_item: bool,
) -> list[str]:
    tags: list[str] = []
    seen: set[str] = set()

    def add(tag: str) -> None:
        if not tag:
            return
        if tag in seen:
            return
        seen.add(tag)
        tags.append(tag)

    for tag in base_tags:
        add(tag)

    if brand_pref:
        add("Preferred brand")
    if past_brand:
        add("Previously purchased brand")
    if past_item:
        add("Previously purchased item")

    return tags


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
    for k in keys:
        if hasattr(obj, k):
            return getattr(obj, k)
        if isinstance(obj, dict) and k in obj:
            return obj[k]
    return None


def _raise_backboard_502(stage: str, exc: BackboardAPIError) -> None:
    raise HTTPException(
        status_code=502,
        detail={
            "message": f"Backboard error during {stage}",
            "error": str(exc),
            "backboard_status": getattr(exc, "status_code", None),
        },
    )


# ============================================================
# Memory model
# ============================================================
DEFAULT_POLICY = {
    "preferred_brands": ["Apple", "Bose", "Logitech"],
    "preferred_tags": [],
    "kept_items": {},            # item_name -> count
    "rejected_items": {},        # item_name -> count
    "price_sensitivity": {"max_cart": 500},
    "rejection_patterns": [],
    "weights": {"ecosystem_fit": 0.4, "design": 0.3, "price": 0.2},
}


def _default_memory(max_total: float) -> dict:
    mem = json.loads(json.dumps(DEFAULT_POLICY))
    mem["price_sensitivity"]["max_cart"] = float(max_total)
    return mem


def _inc_counts(counter: dict, names: list[str], cap: int = 80) -> dict:
    counter = dict(counter or {})
    for n in names:
        nn = (n or "").strip()
        if not nn:
            continue
        counter[nn] = int(counter.get(nn, 0)) + 1
    items = sorted(counter.items(), key=lambda kv: kv[1], reverse=True)[:cap]
    return {k: v for k, v in items}


def _index_inventory(inventory: list[dict]) -> Dict[str, dict]:
    idx: Dict[str, dict] = {}
    for p in inventory or []:
        name = (p.get("name") or "").strip()
        if name:
            idx[name.lower()] = p
    return idx


def _derive_from_items(
    memory_payload: dict,
    kept_items: list[str],
    rejected_items: list[str],
    inventory_snapshot: Optional[list[dict]],
) -> dict:
    kept_items = [k.strip() for k in (kept_items or []) if k and k.strip()]
    rejected_items = [r.strip() for r in (rejected_items or []) if r and r.strip()]

    memory_payload["kept_items"] = _inc_counts(memory_payload.get("kept_items", {}), kept_items)
    memory_payload["rejected_items"] = _inc_counts(memory_payload.get("rejected_items", {}), rejected_items)

    rp = set(_norm(x) for x in (memory_payload.get("rejection_patterns", []) or []) if _norm(x))
    for r in rejected_items:
        rp.add(_norm(r))
    memory_payload["rejection_patterns"] = sorted(rp)

    if inventory_snapshot:
        inv = _index_inventory(inventory_snapshot)

        brand_counts: Dict[str, int] = {}
        tag_counts: Dict[str, int] = {}

        for k in kept_items:
            p = inv.get(k.lower())
            if not p:
                continue

            b = (p.get("brand") or "").strip()
            if b:
                brand_counts[b] = brand_counts.get(b, 0) + 1

            for t in (p.get("tags") or []):
                nt = _norm(t)
                if nt:
                    tag_counts[nt] = tag_counts.get(nt, 0) + 1

        if brand_counts:
            existing = set(memory_payload.get("preferred_brands", []) or [])
            top_brands = [b for b, _ in sorted(brand_counts.items(), key=lambda kv: kv[1], reverse=True)[:6]]
            for b in top_brands:
                existing.add(b)
            memory_payload["preferred_brands"] = sorted(existing)

        if tag_counts:
            existing_tags = set(memory_payload.get("preferred_tags", []) or [])
            top_tags = [t for t, _ in sorted(tag_counts.items(), key=lambda kv: kv[1], reverse=True)[:10]]
            for t in top_tags:
                existing_tags.add(t)
            memory_payload["preferred_tags"] = sorted(existing_tags)

    return memory_payload


def _apply_frontend_preferences_to_memory(memory_payload: dict, req: RecommendationRequest, budget: float) -> dict:
    if req.brandPreferences:
        existing = set(memory_payload.get("preferred_brands", []) or [])
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
    if not allowed_categories_norm:
        return products

    allowed_set = set(allowed_categories_norm)
    filtered: list[Product] = []
    for p in products:
        tagset = set(_norm(t) for t in (p.tags or []))
        type_tag = _norm(getattr(p, "productType", None))
        if type_tag:
            tagset.add(type_tag)
        if tagset.intersection(allowed_set):
            filtered.append(p)

    return filtered if filtered else products


# ============================================================
# Backboard helpers
# ============================================================
async def _add_message_with_timeout(*, stage: str, timeout_s: float, **kwargs):
    try:
        return await asyncio.wait_for(client.add_message(**kwargs), timeout=timeout_s)
    except asyncio.TimeoutError:
        return None
    except BackboardAPIError as e:
        _raise_backboard_502(stage, e)


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
        raise HTTPException(status_code=502, detail={"message": "Backboard add_memory returned no memory_id", "raw": str(created)})

    _db_set_user_memory(user_id, memory_payload, backboard_memory_id=str(new_id))
    return str(new_id)


def _get_assistant_id() -> str:
    assistant_id = _db_get_meta("assistant_id")
    if not assistant_id:
        raise HTTPException(status_code=500, detail="Assistant not initialized")
    return assistant_id


def _fallback_explanation(cart_json: str, intent: str, budget: float, avoid_norm: list[str]) -> str:
    try:
        cart = json.loads(cart_json)
    except Exception:
        cart = {}

    items = cart.get("items") if isinstance(cart, dict) else None
    if not isinstance(items, list):
        items = []

    picked: list[str] = []
    for it in items[:8]:
        if isinstance(it, dict):
            name = (it.get("name") or it.get("title") or "Item").strip()
            brand = (it.get("brand") or it.get("merchant") or "Unknown").strip()
            picked.append(f"{brand} {name}".strip())

    total = cart.get("total") if isinstance(cart, dict) else None
    try:
        total_num = float(total) if total is not None else None
    except Exception:
        total_num = None

    total_str = f"${round(total_num, 2)}" if isinstance(total_num, (int, float)) else "unknown"
    picked_str = "; ".join(picked) if picked else "No items selected"

    constraints_bullets = [
        f"- Under budget ({total_str} / ${int(budget)})" if isinstance(budget, (int, float)) else "- Budget respected",
        "- Matched allowed categories",
        "- Avoided rejected patterns",
    ][:3]

    avoid_samples = [a for a in avoid_norm if a][:4]
    avoided_bullets = [f"- {a}: previously avoided" for a in avoid_samples] or ["- None specified"]

    return (
        "Summary\n"
        f"Picked: {picked_str}. Total: {total_str}.\n\n"
        "Constraints followed\n"
        + "\n".join(constraints_bullets)
        + "\n\n"
        "Avoided\n"
        + "\n".join(avoided_bullets)
        + "\n\n"
        "Preference signal\n"
        "You tend to keep trusted brands and avoid flashy or RGB items."
    )


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
                "Avoid products the user rejected previously.\n"
                "Prefer brands,tags,item patterns the user kept previously.\n"
                "After selecting a cart, explain briefly what was picked and avoided."
            ),
        )
    except BackboardAPIError as e:
        _raise_backboard_502("create_assistant", e)

    assistant_id = _get_attr(assistant, "assistant_id", "id")
    if not assistant_id:
        raise HTTPException(status_code=502, detail={"message": "Backboard create_assistant returned no assistant_id", "raw": str(assistant)})

    _db_set_meta("assistant_id", str(assistant_id))


# ============================================================
# Routes
# ============================================================
@router.get("/health")
async def health():
    return {
        "ok": True,
        "mongo": bool(_db is not None),
        "dbName": MONGO_DB_NAME,
        "decision": {"provider": DECISION_PROVIDER, "model": DECISION_MODEL, "timeout_s": DECISION_TIMEOUT_S},
        "explain": {"provider": EXPLAIN_PROVIDER, "model": EXPLAIN_MODEL, "timeout_s": EXPLAIN_TIMEOUT_S},
    }


@router.post("/recommend")
async def recommend(req: RecommendationRequest):
    # Self-heal init during dev/hotreload
    try:
        assistant_id = _get_assistant_id()
    except HTTPException as e:
        if e.status_code == 500 and str(e.detail) == "Assistant not initialized":
            await startup()
            assistant_id = _get_assistant_id()
        else:
            raise

    user_id = _normalize_user_id(req)
    budget = _normalize_budget(req)

    mem_doc = _db_get_user_memory(user_id) or {}
    memory_payload = mem_doc.get("memory") or _default_memory(max_total=budget)

    # Apply frontend signals (persistent)
    memory_payload = _apply_frontend_preferences_to_memory(memory_payload, req, budget)

    # Sync memory to Backboard
    await _ensure_backboard_memory(assistant_id, user_id, memory_payload)

    if req.agentEnabled is False:
        empty = {"items": [], "total": 0.0, "notes": "Agent disabled by user."}
        return JSONResponse(
            content={
                "cart": json.dumps(empty),
                "explanation": "Agent is disabled. Enable it to generate recommendations.",
            }
        )

    intent_text = (req.shoppingIntent or "").strip()
    context_text = (req.context or "").strip()
    intent = intent_text or context_text or "personal use"

    allowed_norm = _normalize_list(req.allowedCategories)
    preferred_norm = _normalize_list(req.brandPreferences)

    raw_avoid = memory_payload.get("rejection_patterns", []) or []
    avoid_norm = [_norm(x) for x in raw_avoid if _norm(x)]
    avoid_norm = [x for x in avoid_norm if x not in set(preferred_norm)]

    inventory_filtered = _filter_inventory_by_allowed_categories(req.products, allowed_norm)

    preferred_tags = memory_payload.get("preferred_tags", []) or []
    kept_item_counts = memory_payload.get("kept_items", {}) or {}
    top_kept = [k for k, _ in sorted(kept_item_counts.items(), key=lambda kv: kv[1], reverse=True)[:8]]

    if not inventory_filtered:
        empty = {
            "items": [],
            "total": 0.0,
            "notes": "No items match the selected categories. Try different categories or broaden your selection.",
        }
        return JSONResponse(
            content={
                "cart": json.dumps(empty),
                "explanation": "No relevant items were available for the selected categories.",
            }
        )

    # Create Backboard thread
    try:
        thread = await client.create_thread(assistant_id)
    except BackboardAPIError as e:
        _raise_backboard_502("create_thread", e)

    thread_id = _get_attr(thread, "thread_id", "id")
    if not thread_id:
        raise HTTPException(status_code=502, detail={"message": "Backboard create_thread returned no thread_id", "raw": str(thread)})

    decision_prompt = {
        "task": "Select a cart from inventory that best matches intent and preferences while respecting constraints.",
        "intent": intent,
        "constraints": {
            "max_total": budget,
            "allowed_categories": req.allowedCategories or [],
            "brand_preferences": req.brandPreferences or [],
            "price_sensitivity": req.priceSensitivity,
            "avoid": avoid_norm,
            "prefer": {
                "brands": memory_payload.get("preferred_brands", []) or [],
                "tags": preferred_tags,
                "items": top_kept,
            },
            "hard_rules": [
                "Return ONLY valid JSON. No markdown, no extra text.",
                "If allowed_categories is non-empty, ONLY choose items whose tags include at least one allowed category token.",
                "If a brand appears in both brand_preferences and avoid, brand_preferences wins for this run.",
                "Reject anything in avoid.",
                "Prefer items whose brand is in prefer.brands when possible.",
                "Prefer items whose tags overlap prefer.tags when possible.",
                "If any prefer.items appear in inventory, include them unless they violate avoid or budget.",
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

    decision_obj = await _add_message_with_timeout(
        stage="add_message decision",
        timeout_s=DECISION_TIMEOUT_S,
        thread_id=str(thread_id),
        content=json.dumps(decision_prompt),
        llm_provider=DECISION_PROVIDER,
        model_name=DECISION_MODEL,
        memory="Auto",
        stream=False,
    )

    if decision_obj is None:
        raise HTTPException(status_code=502, detail={"message": "Backboard decision timed out"})

    decision_content = _get_attr(decision_obj, "content") or ""
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
            "If intent conflicts with allowed categories, reinterpret intent within allowed categories in ONE short clause.",
            "If a brand appears in both brand_preferences and avoid, treat brand_preferences as the session override for this run.",
            "Hard cap: 140-220 words total.",
            "Use EXACTLY 4 sections with these headings: Summary, Constraints followed, Avoided, Preference signal.",
            "Each section must be 1-2 lines max.",
            "Summary: 1 sentence listing items picked plus total. No extra rationale.",
            "Constraints followed: max 3 bullets, each <= 8 words.",
            "Avoided: max 4 bullets, each must name a specific inventory item and give a <= 8 word reason.",
            "Preference signal: 1 sentence stating the single strongest learned preference from history that drove choices. Do not say 'based on memory' or similar.",
            "Do NOT add suggestions, alternatives, or next steps.",
            "Do NOT restate the full intent or the full constraints list.",
        ],
        "cart_reference": "Use the latest decision in this thread as the chosen cart and reference only items from the provided inventory when listing avoided examples.",
    }

    explanation_obj = await _add_message_with_timeout(
        stage="add_message explanation",
        timeout_s=EXPLAIN_TIMEOUT_S,
        thread_id=str(thread_id),
        content=json.dumps(explain_prompt),
        llm_provider=EXPLAIN_PROVIDER,
        model_name=EXPLAIN_MODEL,
        memory="Auto",
        stream=False,
    )

    # One retry
    if explanation_obj is None:
        explanation_obj = await _add_message_with_timeout(
            stage="add_message explanation retry",
            timeout_s=EXPLAIN_TIMEOUT_S,
            thread_id=str(thread_id),
            content=json.dumps(explain_prompt),
            llm_provider=EXPLAIN_PROVIDER,
            model_name=EXPLAIN_MODEL,
            memory="Auto",
            stream=False,
        )

    if explanation_obj is None:
        explanation_content = _fallback_explanation(
            cart_json=decision_content,
            intent=intent,
            budget=budget,
            avoid_norm=avoid_norm,
        )
    else:
        explanation_content = _get_attr(explanation_obj, "content") or ""
        if not isinstance(explanation_content, str):
            explanation_content = str(explanation_content)

    inventory_snapshot = [p.dict() for p in inventory_filtered]
    _db_insert_session(user_id=user_id, cart=decision_content, explanation=explanation_content, inventory=inventory_snapshot)

    return JSONResponse(content={"cart": decision_content, "explanation": explanation_content})


@router.post("/explain", response_model=ExplainResult)
async def explain(req: ExplainRequest):
    # Self-heal init during dev/hotreload
    try:
        assistant_id = _get_assistant_id()
    except HTTPException as e:
        if e.status_code == 500 and str(e.detail) == "Assistant not initialized":
            await startup()
            assistant_id = _get_assistant_id()
        else:
            raise

    if not req.bundle or not req.bundle.items:
        return ExplainResult(text="No items to explain yet. Generate a bundle first.")

    try:
        thread = await client.create_thread(assistant_id)
    except BackboardAPIError as e:
        _raise_backboard_502("create_thread", e)

    thread_id = _get_attr(thread, "thread_id", "id")
    if not thread_id:
        raise HTTPException(status_code=502, detail={"message": "Backboard create_thread returned no thread_id", "raw": str(thread)})

    items_payload = [
        {
            "title": it.title,
            "merchant": it.merchant,
            "category": it.category,
            "price": it.price,
            "qty": it.qty,
            "reasonTags": it.reasonTags,
        }
        for it in req.bundle.items
    ]

    explain_prompt = {
        "task": "Provide a fresh explanation of why this bundle fits the user's intent and constraints.",
        "intent": req.intent or "general shopping",
        "bundle": {
            "subtotal": req.bundle.subtotal,
            "currency": req.bundle.currency,
            "items": items_payload,
        },
        "guidelines": [
            "Give a new insight on each request.",
            "Do not mention internal IDs or system messages.",
            "Keep it concise (120-200 words).",
            "Use EXACTLY 3 short paragraphs.",
            "Paragraph 1: 1 sentence summary of the overall selection.",
            "Paragraph 2: 2-3 sentences about constraints and tradeoffs.",
            "Paragraph 3: 1-2 sentences about preference signals and avoided items.",
        ],
    }

    explanation_obj = await _add_message_with_timeout(
        stage="add_message explain-only",
        timeout_s=EXPLAIN_TIMEOUT_S,
        thread_id=str(thread_id),
        content=json.dumps(explain_prompt),
        llm_provider=EXPLAIN_PROVIDER,
        model_name=EXPLAIN_MODEL,
        memory="Auto",
        stream=False,
    )

    # One retry
    if explanation_obj is None:
        explanation_obj = await _add_message_with_timeout(
            stage="add_message explain-only retry",
            timeout_s=EXPLAIN_TIMEOUT_S,
            thread_id=str(thread_id),
            content=json.dumps(explain_prompt),
            llm_provider=EXPLAIN_PROVIDER,
            model_name=EXPLAIN_MODEL,
            memory="Auto",
            stream=False,
        )

    if explanation_obj is None:
        titles = ", ".join([it.title for it in req.bundle.items[:6]])
        fallback = (
            f"Summary: Selected {len(req.bundle.items)} items totaling {req.bundle.currency} {req.bundle.subtotal:.2f}. "
            f"Key picks include {titles or 'the listed items'}.\n\n"
            "Constraints: Matched allowed categories and stayed within budget.\n\n"
            "Preference signal: Emphasized consistency with your stated intent."
        )
        return ExplainResult(text=fallback)

    explanation_content = _get_attr(explanation_obj, "content") or ""
    if not isinstance(explanation_content, str):
        explanation_content = str(explanation_content)

    return ExplainResult(text=explanation_content)


@router.post("/feedback")
async def record_feedback(req: FeedbackRequest):
    mem_doc = _db_get_user_memory(req.user_id) or {}
    memory_payload = mem_doc.get("memory") or _default_memory(max_total=500)

    rejected = [r.strip() for r in (req.rejected_items or []) if r and r.strip()]
    kept = [k.strip() for k in (req.kept_items or []) if k and k.strip()]

    # If kept_items not provided, infer from latest session cart
    if not kept:
        latest = _db_get_latest_session(req.user_id) or {}
        cart_str = latest.get("cart") or ""
        try:
            cart_obj = json.loads(cart_str) if isinstance(cart_str, str) else None
        except Exception:
            cart_obj = None

        inferred: list[str] = []
        if isinstance(cart_obj, dict):
            items = cart_obj.get("items") or []
            if isinstance(items, list):
                for it in items:
                    if isinstance(it, dict):
                        n = (it.get("name") or it.get("title") or "").strip()
                        if n:
                            inferred.append(n)

        rejected_norm = set(_norm(r) for r in rejected if _norm(r))
        kept = [n for n in inferred if _norm(n) not in rejected_norm]

    latest_session = _db_get_latest_session(req.user_id)
    inventory_snapshot = (latest_session or {}).get("inventory") if isinstance(latest_session, dict) else None

    memory_payload = _derive_from_items(
        memory_payload=memory_payload,
        kept_items=kept,
        rejected_items=rejected,
        inventory_snapshot=inventory_snapshot if isinstance(inventory_snapshot, list) else None,
    )

    existing_backboard_id = (mem_doc or {}).get("backboard_memory_id")
    _db_set_user_memory(req.user_id, memory_payload, backboard_memory_id=existing_backboard_id)

    _db_insert_correction(user_id=req.user_id, rejected=rejected, kept=kept, reason=req.reason)

    # Sync to Backboard
    try:
        assistant_id = _get_assistant_id()
    except HTTPException as e:
        if e.status_code == 500 and str(e.detail) == "Assistant not initialized":
            await startup()
            assistant_id = _get_assistant_id()
        else:
            raise

    await _ensure_backboard_memory(assistant_id, req.user_id, memory_payload)

    return {"status": "updated", "learned": {"kept": kept[:10], "rejected": rejected[:10]}}


@router.post("/debug/echo")
async def echo(req: RecommendationRequest):
    return req.dict()
