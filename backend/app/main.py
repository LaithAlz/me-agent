from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.agent import router as agent_router
from app.api.shopify import router as shopify_router


app = FastAPI(title="Me-Agent Backend", version="0.1.0")

app.add_middleware(
	CORSMiddleware,
	allow_origins=["http://localhost:8080", "http://127.0.0.1:8080"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

app.include_router(agent_router)
app.include_router(shopify_router)


@app.get("/health")
def health_check() -> dict:
	return {"status": "ok"}
