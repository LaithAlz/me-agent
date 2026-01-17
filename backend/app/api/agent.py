from typing import List
from fastapi import APIRouter

from app.schemas.bundle import BundleRequest, BundleResult, BundleItem, ExplainRequest, ExplainResult
from app.api.shopify import PRODUCTS, PURCHASE_HISTORY


router = APIRouter(prefix="/api/agent", tags=["agent"])


def _normalize(text: str) -> str:
	return text.strip().lower()


def _build_reason_tags(
	base_tags: List[str],
	brand_pref: bool,
	past_brand: bool,
	past_item: bool,
) -> List[str]:
	tags = list(base_tags)
	if brand_pref:
		tags.append("Brand preference")
	if past_brand:
		tags.append("Previously purchased brand")
	if past_item:
		tags.append("Previously purchased item")
	return tags


@router.post("/bundle", response_model=BundleResult)
def generate_bundle(payload: BundleRequest) -> BundleResult:
	if not payload.agentEnabled:
		return BundleResult(items=[], subtotal=0.0, currency="USD")

	persona_id = payload.personaId or "alex"
	past_purchases = PURCHASE_HISTORY.get(persona_id, [])
	past_vendors = {_normalize(p.vendor) for p in past_purchases}
	past_products = {p.productId for p in past_purchases}
	brand_prefs = {_normalize(b) for b in payload.brandPreferences}

	available = [p for p in PRODUCTS if p.productType in payload.allowedCategories]

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
				id=product.variants[0].id,
				title=product.title,
				price=price,
				category=product.productType,
				merchant=product.vendor,
				reasonTags=reason_tags,
				qty=1,
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
			if any(item.id == product.variants[0].id for item in selected_items):
				continue
			add_product(product)

	return BundleResult(items=selected_items, subtotal=subtotal, currency="USD")


@router.post("/explain", response_model=ExplainResult)
def explain_bundle(payload: ExplainRequest) -> ExplainResult:
	item_count = len(payload.bundle.items)
	categories = sorted({item.category for item in payload.bundle.items})
	category_text = ", ".join(categories) if categories else "your selected categories"

	text = (
		f"Based on your shopping intent \"{payload.intent[:50]}{'...' if len(payload.intent) > 50 else ''}\", "
		f"I've curated a bundle of {item_count} items across {len(categories)} "
		f"{'category' if len(categories) == 1 else 'categories'}: {category_text}.\n\n"
		f"Each item was selected because it:\n"
		f"* Falls within your allowed categories\n"
		f"* Stays within your budget of ${payload.bundle.subtotal:.2f}\n"
		f"* Matches your stated preferences and purchase history\n\n"
		f"The total comes to ${payload.bundle.subtotal:.2f}, leaving room in your budget for adjustments. "
		f"Remember: You have full control. Review each item, adjust quantities, and only proceed to checkout when you're ready. "
		f"No purchases will be made without your explicit approval."
	)

	return ExplainResult(text=text)
