"""
analyze.py — POST /api/analyze
Accepts scraped product data, streams an AI analysis back via SSE.
"""

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from models.schemas import ProductData
from services.claude_service import stream_analysis

router = APIRouter()


@router.post("/analyze")
async def analyze_product(product: ProductData):
    """
    Accepts a ProductData payload from the browser extension and streams
    back an SSE response with progress events and the final analysis result.
    """
    return StreamingResponse(
        stream_analysis(product),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # Disable Nginx buffering for SSE
        },
    )
