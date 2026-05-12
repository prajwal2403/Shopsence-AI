"""
claude_service.py — Gemini AI scoring pipeline for ShopSense AI (Phase 3).

Changes from Phase 1:
  - Async-safe: Gemini sync SDK runs in thread pool via asyncio.to_thread()
  - Enhanced prompt: explicit fake-review detection, price-percentile analysis,
    spec-completeness audit, structured CoT reasoning hidden from output
  - Returns final result dict for caching by the caller
"""

import asyncio
import json
import os
import re

import google.genai as genai
from google.genai import types as genai_types

from models.schemas import (
    AnalysisResult, ProductData, ReviewItem, ScoreBreakdown, TopReviews,
)


# ─── Gemini client factory ────────────────────────────────────────────────────

def _get_client() -> genai.Client:
    return genai.Client(api_key=os.environ["GEMINI_API_KEY"])


def _call_gemini_sync(prompt: str) -> str:
    """Synchronous Gemini call — runs in asyncio.to_thread()."""
    client = _get_client()
    model_name = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")
    response = client.models.generate_content(
        model=model_name,
        contents=prompt,
        config=genai_types.GenerateContentConfig(
            temperature=0.25,
            max_output_tokens=2000,
        ),
    )
    return response.text


# ─── Prompt builder ───────────────────────────────────────────────────────────

def build_prompt(product: ProductData) -> str:
    reviews_text = "\n".join(
        f"- [{'✓ Verified' if r.verified else '✗ Unverified'}] {r.rating}★ | "
        f"'{r.title}' by {r.author or 'Unknown'} on {r.date or 'unknown date'}: "
        f"{r.body[:400]}"
        for r in product.topReviews[:10]
    ) or "No reviews available on this page."

    specs_text = "\n".join(
        f"  • {k}: {v}" for k, v in list(product.specs.items())[:25]
    ) or "No specifications listed."

    return f"""You are ShopSense AI, an expert e-commerce product analyst. Analyse the following product scraped from {product.platform.title()} and produce a comprehensive JSON evaluation.

═══════════════════════════════════════
PRODUCT INFORMATION
═══════════════════════════════════════
Platform      : {product.platform}
Product Name  : {product.productName}
URL           : {product.url}
Price         : {product.currency} {product.price if product.price else 'Not shown'}
Rating        : {product.rating if product.rating else 'N/A'}/5  ({product.reviewCount or 0} reviews)
Seller        : {product.sellerName or 'Unknown'}
Stock Status  : {product.stockStatus}
Delivery      : {product.deliveryEstimate or 'Not specified'}
Return Policy : {product.returnPolicy or 'Not specified'}

KEY SPECIFICATIONS
{specs_text}

CUSTOMER REVIEWS (up to 10)
{reviews_text}

═══════════════════════════════════════
SCORING INSTRUCTIONS
═══════════════════════════════════════

Score across 6 factors (maximum points shown). Be strict — reserve top scores for genuinely excellent products.

1. priceValue (max 25 pts)
   • 23-25: Exceptional deal, well below typical market rate
   • 18-22: Good value, competitive price
   • 12-17: Average pricing for the category
   • 5-11:  Slightly overpriced
   • 0-4:   Significantly overpriced
   Consider: price vs. category norms, discount depth, included accessories.

2. ratingsQuality (max 20 pts)
   • 18-20: 4.3+ stars with 1000+ reviews, good distribution (not all 5-star)
   • 14-17: 4.0-4.2 stars with decent review count
   • 9-13:  3.5-3.9 stars or low review count (<50)
   • 0-8:   Below 3.5 stars or very few reviews

3. reviewAuthenticity (max 20 pts)
   Deduct heavily for red flags:
   - Only 5-star reviews (no critical reviews at all): -8 pts
   - Many reviews posted on same day or in clusters: -6 pts
   - Generic praise with no specific product details: -5 pts
   - Unverified purchases dominating: -4 pts
   - No reviewer photos or detailed experience: -3 pts
   Start at 20, subtract per red flag found.

4. brandReputation (max 15 pts)
   • 13-15: Well-known brand, strong after-sales, clear warranty
   • 9-12:  Recognisable brand or reputable marketplace seller
   • 5-8:   Unknown brand but seller appears legitimate
   • 0-4:   Unknown brand + no visible warranty/support info

5. specCompleteness (max 10 pts)
   • 9-10: All key specs listed (dimensions, materials, compatibility, etc.)
   • 6-8:  Most specs present, some missing
   • 3-5:  Sparse specs, key details absent
   • 0-2:  Bare minimum or no specs

6. deliveryAvailability (max 10 pts)
   • 9-10: In stock + delivery within 2 days
   • 6-8:  In stock + delivery 3-5 days
   • 3-5:  Limited stock or delivery > 5 days
   • 0-2:  Out of stock or unavailable

═══════════════════════════════════════
OUTPUT REQUIREMENTS
═══════════════════════════════════════

Return ONLY a valid JSON object. No markdown fences, no explanation, no text before or after the JSON.

{{
  "score": <integer 0-100, sum of all breakdown scores>,
  "scoreBreakdown": {{
    "priceValue": <integer 0-25>,
    "ratingsQuality": <integer 0-20>,
    "reviewAuthenticity": <integer 0-20>,
    "brandReputation": <integer 0-15>,
    "specCompleteness": <integer 0-10>,
    "deliveryAvailability": <integer 0-10>
  }},
  "strengths": [
    "<Specific strength grounded in review text or product data — not generic>",
    "<Second specific strength>",
    "<Third specific strength>"
  ],
  "limitations": [
    "<Specific limitation found in reviews or missing specs — not generic>",
    "<Second specific limitation>",
    "<Third specific limitation>"
  ],
  "topReviews": {{
    "positive": {{
      "author": "<reviewer name>",
      "rating": <1-5>,
      "title": "<review title>",
      "body": "<most informative positive review excerpt, max 200 chars>",
      "verified": <true|false>,
      "date": "<review date>"
    }},
    "critical": {{
      "author": "<reviewer name>",
      "rating": <1-5>,
      "title": "<review title>",
      "body": "<most informative critical review excerpt, max 200 chars>",
      "verified": <true|false>,
      "date": "<review date>"
    }},
    "balanced": {{
      "author": "<reviewer name>",
      "rating": <1-5>,
      "title": "<review title>",
      "body": "<most balanced/nuanced review excerpt, max 200 chars>",
      "verified": <true|false>,
      "date": "<review date>"
    }}
  }},
  "recommendation": "<One punchy sentence: who should buy this and why, OR who should skip it>",
  "alternativeSearchQuery": "<Search query to find a better alternative, e.g. 'wireless headphones under 2000 rupees good bass 2024'>"
}}

Rules:
- score MUST equal the exact sum of the six breakdown scores
- strengths and limitations MUST reference specific details from the reviews or specs, never write generic statements like "good quality" or "some users complained"
- If no critical review exists in the data, set topReviews.critical to null
- If no balanced review exists, set topReviews.balanced to null"""


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _sse(event_type: str, payload: dict) -> str:
    return f"data: {json.dumps({'type': event_type, **payload})}\n\n"


def _parse_result(full_text: str, product: ProductData) -> AnalysisResult | None:
    """Strip markdown fences and parse Claude/Gemini JSON into AnalysisResult."""
    try:
        clean = re.sub(r"```(?:json)?", "", full_text).strip().rstrip("`").strip()
        raw = json.loads(clean)

        def parse_review(d: dict | None) -> ReviewItem | None:
            if not d:
                return None
            return ReviewItem(
                author=d.get("author", ""),
                rating=d.get("rating"),
                title=d.get("title", ""),
                body=d.get("body", ""),
                verified=bool(d.get("verified", False)),
                date=d.get("date", ""),
            )

        tr = raw.get("topReviews", {}) or {}
        return AnalysisResult(
            platform=product.platform,
            url=product.url,
            productName=product.productName,
            score=int(raw.get("score", 50)),
            scoreBreakdown=ScoreBreakdown(**raw.get("scoreBreakdown", {})),
            strengths=raw.get("strengths", []),
            limitations=raw.get("limitations", []),
            topReviews=TopReviews(
                positive=parse_review(tr.get("positive")),
                critical=parse_review(tr.get("critical")),
                balanced=parse_review(tr.get("balanced")),
            ),
            recommendation=raw.get("recommendation", ""),
            alternativeSearchQuery=raw.get("alternativeSearchQuery", ""),
        )
    except (json.JSONDecodeError, KeyError, TypeError, ValueError) as exc:
        # Log the raw text to help debug prompt issues
        print(f"[ShopSense] JSON parse error: {exc}\nRaw response:\n{full_text[:500]}")
        return None


# ─── Main streaming generator ─────────────────────────────────────────────────

async def stream_analysis(product: ProductData):
    """
    Async generator → yields SSE strings.

    The synchronous Gemini SDK call runs inside asyncio.to_thread() so it
    never blocks FastAPI's event loop.

    Caller receives:
      progress events  → {type: "progress", message: "..."}
      result event     → {type: "result", data: AnalysisResult dict}
      error event      → {type: "error", message: "..."}
      [DONE] sentinel  → always last
    """
    yield _sse("progress", {"message": "Building analysis prompt…"})

    model_name = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")

    yield _sse("progress", {"message": f"Asking Gemini AI to score this {product.platform} product…"})

    prompt = build_prompt(product)

    # ── Run synchronous Gemini call in a thread ───────────────────────────────
    try:
        full_text = await asyncio.to_thread(_call_gemini_sync, prompt)
    except Exception as exc:
        yield _sse("error", {"message": f"Gemini API error: {exc}"})
        yield "data: [DONE]\n\n"
        return

    yield _sse("progress", {"message": "Parsing score and insights…"})

    # ── Parse structured response ─────────────────────────────────────────────
    result = _parse_result(full_text, product)

    if result:
        yield _sse("result", {"data": result.model_dump()})
    else:
        yield _sse("error", {"message": "AI returned an unexpected response format. Please try again."})

    yield "data: [DONE]\n\n"
