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
	imageUrl: Optional[str] = None


class BundleResult(BaseModel):
	items: List[BundleItem]
	subtotal: float
	currency: str = "USD"


class BundleRequest(BaseModel):
	shoppingIntent: str = ""
	maxSpend: float = Field(..., gt=0)
	allowedCategories: List[str] = Field(default_factory=list)
	brandPreferences: List[str] = Field(default_factory=list)
	priceSensitivity: int = Field(default=3, ge=1, le=5)
	agentEnabled: bool = True
	personaId: Optional[str] = None


class ExplainRequest(BaseModel):
	intent: str
	bundle: BundleResult


class ExplainResult(BaseModel):
	text: str
	audioUrl: Optional[str] = None
