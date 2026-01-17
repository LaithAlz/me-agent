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


_DEFAULT_PRODUCTS: List[Product] = [
	Product(
		id="gid://shopify/Product/3001",
		title="Wireless Headphones",
		vendor="TechVendor",
		productType="electronics",
		tags=["wireless", "audio"],
		images=["https://example.com/headphones.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4001", title="Default", price=99.99)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3002",
		title="Smartphone Case",
		vendor="TechVendor",
		productType="accessories",
		tags=["phone", "protection"],
		images=["https://example.com/case.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4002", title="Default", price=19.99)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3003",
		title="Laptop Stand",
		vendor="TechVendor",
		productType="accessories",
		tags=["laptop", "ergonomic"],
		images=["https://example.com/stand.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4003", title="Default", price=49.99)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3004",
		title="Bluetooth Speaker",
		vendor="SoundWave",
		productType="electronics",
		tags=["audio", "portable", "bluetooth"],
		images=["https://example.com/speaker.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4004", title="Default", price=79.99)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3005",
		title="Mechanical Keyboard",
		vendor="KeyPro",
		productType="electronics",
		tags=["keyboard", "mechanical", "gaming"],
		images=["https://example.com/keyboard.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4005", title="Default", price=129.99)],
		inStock=False,
	),
	Product(
		id="gid://shopify/Product/3006",
		title="Wireless Mouse",
		vendor="KeyPro",
		productType="accessories",
		tags=["mouse", "wireless", "ergonomic"],
		images=["https://example.com/mouse.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4006", title="Default", price=39.99)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3007",
		title="USB-C Charging Cable",
		vendor="ChargeIt",
		productType="accessories",
		tags=["charging", "usb-c"],
		images=["https://example.com/cable.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4007", title="Default", price=14.99)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3008",
		title="Smartwatch",
		vendor="FitTech",
		productType="electronics",
		tags=["wearable", "fitness", "smart"],
		images=["https://example.com/smartwatch.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4008", title="Default", price=199.99)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3009",
		title="Noise Cancelling Earbuds",
		vendor="SoundWave",
		productType="electronics",
		tags=["audio", "wireless", "noise-cancelling"],
		images=["https://example.com/earbuds.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4009", title="Default", price=149.99)],
		inStock=False,
	),
	Product(
		id="gid://shopify/Product/3010",
		title="Webcam 1080p",
		vendor="VisionTech",
		productType="electronics",
		tags=["camera", "streaming", "remote-work"],
		images=["https://example.com/webcam.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4010", title="Default", price=59.99)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3011",
		title="Reusable Water Bottle",
		vendor="GreenLife",
		productType="lifestyle",
		tags=["eco-friendly", "hydration"],
		images=["https://example.com/waterbottle.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4011", title="Default", price=24.99)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3012",
		title="Aromatic Soy Candle",
		vendor="CozyCorner",
		productType="home",
		tags=["home", "relaxation", "scented"],
		images=["https://example.com/candle.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4012", title="Default", price=18.50)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3013",
		title="Minimalist Backpack",
		vendor="UrbanCarry",
		productType="fashion",
		tags=["travel", "fashion", "storage"],
		images=["https://example.com/backpack.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4013", title="Default", price=89.99)],
		inStock=False,
	),
	Product(
		id="gid://shopify/Product/3014",
		title="Desk Plant (Succulent)",
		vendor="Plantify",
		productType="home",
		tags=["plant", "decor", "workspace"],
		images=["https://example.com/succulent.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4014", title="Default", price=15.99)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3015",
		title="Instant Ramen Variety Pack",
		vendor="NoodleHouse",
		productType="grocery",
		tags=["food", "convenience", "snacks"],
		images=["https://example.com/ramen.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4015", title="Default", price=29.99)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3016",
		title="Yoga Mat",
		vendor="ZenMotion",
		productType="fitness",
		tags=["fitness", "wellness", "exercise"],
		images=["https://example.com/yogamat.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4016", title="Default", price=44.99)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3017",
		title="Board Game: City Builders",
		vendor="PlayForge",
		productType="entertainment",
		tags=["games", "strategy", "multiplayer"],
		images=["https://example.com/boardgame.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4017", title="Default", price=54.99)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3018",
		title="Vintage-Style Wall Clock",
		vendor="TimelessCo",
		productType="home",
		tags=["decor", "timepiece", "vintage"],
		images=["https://example.com/clock.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4018", title="Default", price=67.00)],
		inStock=False,
	),
	Product(
		id="gid://shopify/Product/3019",
		title="Cookbook: 30-Minute Meals",
		vendor="KitchenReads",
		productType="books",
		tags=["cooking", "recipes", "healthy"],
		images=["https://example.com/cookbook.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4019", title="Default", price=34.95)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3020",
		title="Noise-Reducing Sleep Mask",
		vendor="RestEasy",
		productType="wellness",
		tags=["sleep", "wellness", "travel"],
		images=["https://example.com/sleepmask.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4020", title="Default", price=22.99)],
		inStock=True,
	),
]


PRODUCTS: List[Product] = list(_DEFAULT_PRODUCTS)


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
