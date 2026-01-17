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


PRODUCTS: List[Product] = [
	Product(
		id="gid://shopify/Product/1001",
		title="Ergonomic Desk Chair",
		vendor="OfficePro",
		productType="office",
		tags=["office", "chair", "ergonomic"],
		images=["https://images.example.com/products/office-chair.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/2001", title="Standard", price=89.99)],
	),
	Product(
		id="gid://shopify/Product/1002",
		title="Standing Desk Converter",
		vendor="DeskMaster",
		productType="office",
		tags=["office", "desk"],
		images=["https://images.example.com/products/desk-converter.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/2002", title="Standard", price=45.00)],
	),
	Product(
		id="gid://shopify/Product/1101",
		title="Wireless Mouse",
		vendor="TechGear",
		productType="electronics",
		tags=["electronics", "mouse", "wireless"],
		images=["https://images.example.com/products/wireless-mouse.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/2101", title="Standard", price=29.99)],
	),
	Product(
		id="gid://shopify/Product/1102",
		title="USB-C Hub",
		vendor="ConnectPlus",
		productType="electronics",
		tags=["electronics", "hub", "usb-c"],
		images=["https://images.example.com/products/usb-c-hub.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/2102", title="Standard", price=39.99)],
	),
	Product(
		id="gid://shopify/Product/1201",
		title="Cotton T-Shirt Pack",
		vendor="BasicWear",
		productType="clothing",
		tags=["clothing", "tshirt"],
		images=["https://images.example.com/products/tshirt-pack.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/2201", title="Medium", price=24.99)],
	),
	Product(
		id="gid://shopify/Product/1202",
		title="Denim Jeans",
		vendor="DenimCo",
		productType="clothing",
		tags=["clothing", "jeans"],
		images=["https://images.example.com/products/denim-jeans.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/2202", title="32x32", price=49.99)],
	),
	Product(
		id="gid://shopify/Product/1301",
		title="Smart Thermostat",
		vendor="SmartHome",
		productType="home",
		tags=["home", "smart", "thermostat"],
		images=["https://images.example.com/products/thermostat.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/2301", title="Standard", price=79.99)],
	),
	Product(
		id="gid://shopify/Product/1302",
		title="Air Purifier",
		vendor="CleanAir",
		productType="home",
		tags=["home", "air"],
		images=["https://images.example.com/products/air-purifier.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/2302", title="Standard", price=65.00)],
	),
	Product(
		id="gid://shopify/Product/1401",
		title="Yoga Mat",
		vendor="FitGear",
		productType="sports",
		tags=["sports", "yoga"],
		images=["https://images.example.com/products/yoga-mat.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/2401", title="Standard", price=22.99)],
	),
	Product(
		id="gid://shopify/Product/1402",
		title="Resistance Bands Set",
		vendor="FitGear",
		productType="sports",
		tags=["sports", "bands"],
		images=["https://images.example.com/products/resistance-bands.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/2402", title="Standard", price=18.50)],
	),
	Product(
		id="gid://shopify/Product/1501",
		title="Productivity Handbook",
		vendor="BookStore",
		productType="books",
		tags=["books", "productivity"],
		images=["https://images.example.com/products/productivity-handbook.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/2501", title="Paperback", price=15.99)],
	),
	Product(
		id="gid://shopify/Product/1601",
		title="Skincare Set",
		vendor="GlowUp",
		productType="beauty",
		tags=["beauty", "skincare"],
		images=["https://images.example.com/products/skincare-set.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/2601", title="Standard", price=35.00)],
	),
	Product(
		id="gid://shopify/Product/1701",
		title="Organic Snack Box",
		vendor="HealthyBites",
		productType="food",
		tags=["food", "snacks"],
		images=["https://images.example.com/products/snack-box.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/2701", title="Standard", price=28.99)],
	),
]


PURCHASE_HISTORY: Dict[str, List[PurchaseHistoryItem]] = {
	"alex": [
		PurchaseHistoryItem(
			productId="gid://shopify/Product/1101",
			title="Wireless Mouse",
			vendor="TechGear",
			category="electronics",
			price=29.99,
			purchasedAt="2024-10-02",
		),
		PurchaseHistoryItem(
			productId="gid://shopify/Product/1202",
			title="Denim Jeans",
			vendor="DenimCo",
			category="clothing",
			price=49.99,
			purchasedAt="2024-09-15",
		),
	],
	"jamie": [
		PurchaseHistoryItem(
			productId="gid://shopify/Product/1401",
			title="Yoga Mat",
			vendor="FitGear",
			category="sports",
			price=22.99,
			purchasedAt="2024-11-05",
		),
		PurchaseHistoryItem(
			productId="gid://shopify/Product/1302",
			title="Air Purifier",
			vendor="CleanAir",
			category="home",
			price=65.00,
			purchasedAt="2024-08-20",
		),
	],
}


CARTS: Dict[str, Cart] = {}
_cart_counter = 0


def _next_cart_id() -> str:
	global _cart_counter
	_cart_counter += 1
	return f"cart_{_cart_counter}"


@router.get("/products/search", response_model=List[Product])
def search_products(
	query: Optional[str] = Query(default=None, description="Search query"),
	category: Optional[str] = Query(default=None, description="Product category"),
	brand: Optional[str] = Query(default=None, description="Vendor/brand"),
	min_price: Optional[float] = Query(default=None, ge=0),
	max_price: Optional[float] = Query(default=None, ge=0),
	limit: int = Query(default=20, ge=1, le=100),
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
		cart.lines.append(CartLine(merchandiseId=line.merchandiseId, quantity=line.quantity))

	checkout_url = f"https://checkout.shopify.com/mock/{cart.id}"
	cart.checkoutUrl = checkout_url
	CARTS[cart.id] = cart

	return CartLinesAddResponse(checkoutUrl=checkout_url)
