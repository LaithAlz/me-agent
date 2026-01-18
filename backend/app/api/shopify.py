from typing import Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field


router = APIRouter(prefix="/api/shopify", tags=["shopify"])


class ProductVariant(BaseModel):
	id: str
	title: str
	price: float
	sku: Optional[str] = None


class Product(BaseModel):
	id: str
	title: str
	vendor: str
	productType: str
	tags: List[str] = Field(default_factory=list)
	images: List[str] = Field(default_factory=list)
	variants: List[ProductVariant]
	stockQuantity: Optional[int] = None
	inStock: Optional[bool] = None


class PurchaseHistoryItem(BaseModel):
	productId: str
	title: str
	vendor: str
	category: str
	price: float
	purchasedAt: str


class CartLineInput(BaseModel):
	merchandiseId: str
	quantity: int = Field(default=1, ge=1)


class CartCreateResponse(BaseModel):
	cartId: str


class CartLinesAddRequest(BaseModel):
	cartId: str
	lines: List[CartLineInput]


class CartLinesAddResponse(BaseModel):
	checkoutUrl: str


class CartLine(BaseModel):
	merchandiseId: str
	quantity: int


class Cart(BaseModel):
	id: str
	lines: List[CartLine] = Field(default_factory=list)
	checkoutUrl: Optional[str] = None





CARTS: Dict[str, Cart] = {}
_cart_counter = 0


def _next_cart_id() -> str:
	global _cart_counter
	_cart_counter += 1
	return f"cart_{_cart_counter}"


def _find_product_by_merchandise(merchandise_id: str) -> Optional[Product]:
	for product in PRODUCTS:
		if product.id == merchandise_id:
			return product
		if any(variant.id == merchandise_id for variant in product.variants):
			return product
	return None


@router.get("/products/search", response_model=List[Product])
def search_products(
	query: Optional[str] = Query(default=None, description="Search query"),
	category: Optional[str] = Query(default=None, description="Product category"),
	brand: Optional[str] = Query(default=None, description="Vendor/brand"),
	min_price: Optional[float] = Query(default=None, ge=0),
	max_price: Optional[float] = Query(default=None, ge=0),
	limit: int = Query(default=200, ge=1, le=500),
) -> List[Product]:
	results = PRODUCTS

	if query:
		q = query.lower()
		results = [p for p in results if q in p.title.lower() or q in p.vendor.lower() or any(q in t for t in p.tags)]

	if category:
		results = [p for p in results if p.productType == category]

	if brand:
		b = brand.lower()
		results = [p for p in results if b in p.vendor.lower()]

	if min_price is not None:
		results = [p for p in results if p.variants[0].price >= min_price]

	if max_price is not None:
		results = [p for p in results if p.variants[0].price <= max_price]

	return results[:limit]


@router.get("/personas/{persona_id}/history", response_model=List[PurchaseHistoryItem])
def get_purchase_history(persona_id: str) -> List[PurchaseHistoryItem]:
	return PURCHASE_HISTORY.get(persona_id, [])


@router.post("/cart/create", response_model=CartCreateResponse)
def cart_create() -> CartCreateResponse:
	cart_id = _next_cart_id()
	CARTS[cart_id] = Cart(id=cart_id, lines=[], checkoutUrl=None)
	return CartCreateResponse(cartId=cart_id)


@router.post("/cart/lines/add", response_model=CartLinesAddResponse)
def cart_lines_add(payload: CartLinesAddRequest) -> CartLinesAddResponse:
	cart = CARTS.get(payload.cartId)
	if not cart:
		raise HTTPException(status_code=404, detail="Cart not found")

	for line in payload.lines:
		product = _find_product_by_merchandise(line.merchandiseId)
		max_qty = product.stockQuantity if product else None
		quantity = line.quantity if max_qty is None else min(line.quantity, max_qty)
		if quantity <= 0:
			continue
		cart.lines.append(CartLine(merchandiseId=line.merchandiseId, quantity=quantity))

	checkout_url = f"https://checkout.shopify.com/mock/{cart.id}"
	cart.checkoutUrl = checkout_url
	CARTS[cart.id] = cart

	return CartLinesAddResponse(checkoutUrl=checkout_url)
