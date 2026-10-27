import os
import uvicorn

print("uvicorn imported from:", uvicorn.__file__)

port = int(os.environ.get("PORT", "8000"))

uvicorn.run(
    "app.main:app",
    host="0.0.0.0",
    port=port,
    log_level="info",
)
