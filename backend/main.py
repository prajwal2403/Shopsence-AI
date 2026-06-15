"""
main.py — ShopSense AI FastAPI application entry point.
"""

import os
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

# Explicitly resolve .env relative to this file — works in uvicorn --reload subprocesses
load_dotenv(dotenv_path=Path(__file__).parent / ".env")

from routes.health import router as health_router
from routes.analyze import router as analyze_router

# ─── App ──────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="ShopSense AI Backend",
    description="AI-powered product analysis proxy for the ShopSense browser extension.",
    version="1.0.0",
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
# FastAPI's built-in CORSMiddleware uses "*" which the spec limits to http/https
# schemes only — chrome-extension:// and moz-extension:// origins are silently
# dropped. We use a custom middleware that explicitly echoes back any
# chrome-extension:// or moz-extension:// origin, plus the configured
# http/https origins.

ALLOWED_HTTP_ORIGINS = set(
    o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "*").split(",")
)
ALLOWED_METHODS = "GET, POST, DELETE, OPTIONS"
ALLOWED_HEADERS = "Content-Type, X-Extension-Id, X-Signature, X-Timestamp"


class ExtensionCORSMiddleware(BaseHTTPMiddleware):
    """
    CORS middleware that accepts:
      - Any chrome-extension:// or moz-extension:// origin (browser extension sand-boxed env)
      - Any origin listed in ALLOWED_HTTP_ORIGINS (or * for all http/https)
    """

    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin", "")
        allow_origin = self._resolve_origin(origin)

        # Short-circuit OPTIONS preflight
        if request.method == "OPTIONS":
            return Response(
                status_code=204,
                headers={
                    "Access-Control-Allow-Origin": allow_origin,
                    "Access-Control-Allow-Methods": ALLOWED_METHODS,
                    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
                    "Access-Control-Max-Age": "86400",
                },
            )

        response = await call_next(request)
        response.headers["Access-Control-Allow-Origin"] = allow_origin
        response.headers["Access-Control-Allow-Methods"] = ALLOWED_METHODS
        response.headers["Access-Control-Allow-Headers"] = ALLOWED_HEADERS
        return response

    @staticmethod
    def _resolve_origin(origin: str) -> str:
        # Always allow browser extension origins (Chrome, Edge, Firefox)
        if origin.startswith(("chrome-extension://", "moz-extension://", "safari-extension://")):
            return origin
        # Allow wildcard
        if "*" in ALLOWED_HTTP_ORIGINS:
            return "*"
        # Allow explicitly listed origins
        if origin in ALLOWED_HTTP_ORIGINS:
            return origin
        # Fallback — deny by not setting a permissive origin
        return "null"


app.add_middleware(ExtensionCORSMiddleware)

# ─── Routes ───────────────────────────────────────────────────────────────────

app.include_router(health_router, prefix="/api", tags=["Health"])
app.include_router(analyze_router, prefix="/api", tags=["Analysis"])


@app.get("/")
async def root():
    return {"message": "ShopSense AI Backend is running. POST to /api/analyze to get started."}


# ─── Dev server ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
