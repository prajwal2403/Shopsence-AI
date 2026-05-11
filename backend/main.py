"""
main.py — ShopSense AI FastAPI application entry point.
"""

import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from routes.health import router as health_router
from routes.analyze import router as analyze_router

# ─── App ──────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="ShopSense AI Backend",
    description="AI-powered product analysis proxy for the ShopSense browser extension.",
    version="1.0.0",
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
# Browser extensions need CORS to call from content/background scripts.
# In production restrict ALLOWED_ORIGINS to your extension's chrome-extension:// origin.

allowed_origins = os.environ.get("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-Extension-Id"],
)

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
