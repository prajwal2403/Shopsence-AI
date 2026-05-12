"""
analyze.py — POST /api/analyze  (Phase 3)

Added on top of Phase 1 basic route:
  1. HMAC-based request signing  (optional — only enforced if API_SECRET_KEY is set)
  2. Per-client rate limiting    (20 requests / hour via X-Extension-Id header)
  3. Server-side 24-hour cache   (returns instantly on repeat requests)
  4. Cache stats endpoint        GET /api/cache/stats
  5. Cache invalidation endpoint DELETE /api/cache
"""

import hashlib
import hmac
import json
import os
import time

from fastapi import APIRouter, Header, HTTPException, Request
from fastapi.responses import StreamingResponse

from models.schemas import ProductData
from services.claude_service import stream_analysis
from services.cache_service import analysis_cache, rate_limiter

router = APIRouter()


# ─── HMAC signature verification ──────────────────────────────────────────────

def _verify_signature(signature: str | None, timestamp: str | None, url: str, secret: str) -> bool:
    """
    Verify HMAC-SHA256(secret, f"{url}:{timestamp}").
    Rejects requests older than 5 minutes to prevent replay attacks.
    """
    if not signature or not timestamp:
        return False
    try:
        ts = int(timestamp)
        if abs(time.time() - ts) > 300:  # 5-minute window
            return False
    except (ValueError, TypeError):
        return False

    message = f"{url}:{timestamp}".encode()
    expected = hmac.new(secret.encode(), message, hashlib.sha256).hexdigest()
    return hmac.compare_digest(signature.lower(), expected.lower())


# ─── SSE helper ───────────────────────────────────────────────────────────────

def _sse(event_type: str, payload: dict) -> str:
    return f"data: {json.dumps({'type': event_type, **payload})}\n\n"


# ─── Analyse endpoint ─────────────────────────────────────────────────────────

@router.post("/analyze")
async def analyze_product(
    product: ProductData,
    request: Request,
    x_extension_id: str | None = Header(default=None, alias="X-Extension-Id"),
    x_signature:    str | None = Header(default=None, alias="X-Signature"),
    x_timestamp:    str | None = Header(default=None, alias="X-Timestamp"),
):
    """
    Accepts a scraped ProductData payload.
    Returns a Server-Sent Events stream: progress → result → [DONE].
    """

    # 1. ── HMAC verification ──────────────────────────────────────────────────
    api_secret = os.environ.get("API_SECRET_KEY", "").strip()
    if api_secret:
        if not _verify_signature(x_signature, x_timestamp, product.url, api_secret):
            raise HTTPException(
                status_code=401,
                detail="Invalid or missing request signature. "
                       "Ensure X-Signature and X-Timestamp headers are correct.",
            )

    # 2. ── Rate limiting ──────────────────────────────────────────────────────
    # Use extension ID if provided, fall back to client IP
    client_id = x_extension_id or request.client.host or "anonymous"
    allowed, rate_info = rate_limiter.check(client_id)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit reached ({rate_info['limit']} requests/hour). "
                   f"Try again in {rate_info['reset_in_seconds']} seconds.",
            headers={
                "Retry-After": str(rate_info["reset_in_seconds"]),
                "X-RateLimit-Limit": str(rate_info["limit"]),
                "X-RateLimit-Remaining": "0",
            },
        )

    # 3. ── Cache check ────────────────────────────────────────────────────────
    cached = analysis_cache.get(product.url)
    if cached:
        async def send_cached():
            yield _sse("cache_hit", {"message": "Loaded from cache", "data": cached})
            yield "data: [DONE]\n\n"

        return StreamingResponse(
            send_cached(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
                "X-Cache": "HIT",
                "X-RateLimit-Remaining": str(rate_info["remaining"]),
            },
        )

    # 4. ── Stream from Gemini, then cache the result ──────────────────────────
    async def stream_and_cache():
        result_data = None
        async for chunk in stream_analysis(product):
            yield chunk
            # Intercept the result event to cache it
            if chunk.startswith("data: ") and '"type": "result"' in chunk:
                try:
                    parsed = json.loads(chunk[6:].strip())
                    if parsed.get("type") == "result":
                        result_data = parsed.get("data")
                except (json.JSONDecodeError, KeyError):
                    pass

        if result_data:
            analysis_cache.set(product.url, result_data)

    return StreamingResponse(
        stream_and_cache(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "X-Cache": "MISS",
            "X-RateLimit-Remaining": str(rate_info["remaining"]),
        },
    )


# ─── Cache management endpoints ───────────────────────────────────────────────

@router.get("/cache/stats")
async def cache_stats():
    """Returns cache hit/miss stats and current entry count."""
    return analysis_cache.stats()


@router.delete("/cache")
async def clear_cache(url: str | None = None):
    """
    Clear cache for a specific URL, or all entries if no URL provided.
    Protected: only callable from localhost in production.
    """
    if url:
        removed = analysis_cache.invalidate(url)
        return {"cleared": removed, "url": url}
    count = analysis_cache.clear_all()
    return {"cleared": count, "message": "All cache entries removed."}
