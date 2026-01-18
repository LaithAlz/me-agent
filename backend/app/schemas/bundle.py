from typing import List, Optional
from pydantic import BaseModel, Field


class BundleItem(BaseModel):
	id: str
	title: str
	price: float
	category: str
	merchant: str
	reasonTags: List[str] = Field(default_factory=list)
	qty: int = 1
	stockQuantity: Optional[int] = None
	imageUrl: Optional[str] = None


class BundleResult(BaseModel):
	items: List[BundleItem]
	subtotal: float
	currency: str = "USD"


class CartItemInput(BaseModel):
	id: str
	qty: int = Field(default=1, ge=1)


class BundleRequest(BaseModel):
	shoppingIntent: str = ""
	maxSpend: float = Field(..., gt=0)
	allowedCategories: List[str] = Field(default_factory=list)
	brandPreferences: List[str] = Field(default_factory=list)
	priceSensitivity: int = Field(default=3, ge=1, le=5)
	agentEnabled: bool = True
	personaId: Optional[str] = None
	cartItems: List[CartItemInput] = Field(default_factory=list)


class ExplainRequest(BaseModel):
	intent: str
	bundle: BundleResult


class ExplainResult(BaseModel):
	text: str
	audioUrl: Optional[str] = None
