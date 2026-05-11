"""
gemini_service.py — Google Gemini API integration for ShopSense AI.

Builds the scoring prompt, calls Gemini with streaming enabled,
and parses the structured JSON response.

Free tier: gemini-2.0-flash at aistudio.google.com
"""

import os
import json
import re

import google.generativeai as genai

from models.schemas import ProductData, AnalysisResult, ScoreBreakdown, TopReviews, ReviewItem


def _get_model() -> genai.GenerativeModel:
    genai.configure(api_key=os.environ["GEMINI_API_KEY"])
    model_name = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")
    return genai.GenerativeModel(
        model_name=model_name,
        generation_config=genai.GenerationConfig(
            temperature=0.3,          # Lower temp → more consistent JSON
            max_output_tokens=1500,
        ),
    )


# ─── Prompt builder ───────────────────────────────────────────────────────────

def build_prompt(product: ProductData) -> str:
    reviews_text = "\n".join(
        f"- [{r.rating}★] {r.title}: {r.body[:300]}"
        for r in product.topReviews[:8]
    ) or "No reviews available."

    specs_text = "\n".join(
        f"  {k}: {v}" for k, v in list(product.specs.items())[:20]
    ) or "No specs listed."

    return f"""You are ShopSense AI, an expert product analyst. Analyse the following product and return a JSON evaluation.

## Product Information
- Platform: {product.platform}
- URL: {product.url}
- Name: {product.productName}
- Price: {product.currency} {product.price or "unknown"}
- Rating: {product.rating or "unknown"}/5 ({product.reviewCount or 0} reviews)
- Seller: {product.sellerName or "unknown"}
- Stock: {product.stockStatus}
- Delivery: {product.deliveryEstimate or "unknown"}
- Return Policy: {product.returnPolicy or "unknown"}

## Key Specifications
{specs_text}

## Top Reviews
{reviews_text}

## Your Task
Score this product across six factors and provide actionable insights.

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{{
  "score": <integer 0-100>,
  "scoreBreakdown": {{
    "priceValue": <integer 0-25>,
    "ratingsQuality": <integer 0-20>,
    "reviewAuthenticity": <integer 0-20>,
    "brandReputation": <integer 0-15>,
    "specCompleteness": <integer 0-10>,
    "deliveryAvailability": <integer 0-10>
  }},
  "strengths": ["<specific strength 1>", "<specific strength 2>", "<specific strength 3>"],
  "limitations": ["<specific limitation 1>", "<specific limitation 2>", "<specific limitation 3>"],
  "topReviews": {{
    "positive": {{"author": "", "rating": 5, "title": "", "body": "", "verified": true, "date": ""}},
    "critical": {{"author": "", "rating": 2, "title": "", "body": "", "verified": false, "date": ""}},
    "balanced": {{"author": "", "rating": 3, "title": "", "body": "", "verified": true, "date": ""}}
  }},
  "recommendation": "<one sentence: is this worth buying? what type of buyer is it best for?>",
  "alternativeSearchQuery": "<search query to find a better-rated alternative>"
}}

Scoring guide:
- priceValue (0-25): Compare price vs typical market rate for this category. 25 = exceptional value.
- ratingsQuality (0-20): High star rating + many reviews + good distribution = 20.
- reviewAuthenticity (0-20): Penalise for: only 5-star reviews, batch posting dates, generic language.
- brandReputation (0-15): Known brand + good seller rating + clear return policy = 15.
- specCompleteness (0-10): Detailed specs with all key attributes listed = 10.
- deliveryAvailability (0-10): Fast delivery + in stock = 10.

Be specific and grounded. Strengths/limitations must reference actual product details, not generic statements."""


# ─── Streaming analysis ───────────────────────────────────────────────────────

async def stream_analysis(product: ProductData):
    """
    Async generator that yields SSE-formatted strings.
    Yields progress events during streaming, then the final result.
    """
    model = _get_model()

    yield f"data: {json.dumps({'type': 'progress', 'message': 'Building analysis prompt…'})}\n\n"

    full_text = ""

    try:
        response = model.generate_content(build_prompt(product), stream=True)

        yield f"data: {json.dumps({'type': 'progress', 'message': 'Gemini AI is scoring the product…'})}\n\n"

        char_count = 0
        for chunk in response:
            if chunk.text:
                full_text += chunk.text
                char_count += len(chunk.text)
                # Send a heartbeat every ~150 chars so the popup feels responsive
                if char_count % 150 < len(chunk.text):
                    yield f"data: {json.dumps({'type': 'progress', 'message': 'Evaluating reviews and specs…'})}\n\n"

    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'message': f'Gemini API error: {e}'})}\n\n"
        yield "data: [DONE]\n\n"
        return

    yield f"data: {json.dumps({'type': 'progress', 'message': 'Finalising score…'})}\n\n"

    # Parse the JSON from Gemini's response
    try:
        # Strip any accidental markdown fences Gemini sometimes adds
        clean = re.sub(r"```(?:json)?", "", full_text).strip().rstrip("`").strip()
        raw = json.loads(clean)

        result = AnalysisResult(
            platform=product.platform,
            url=product.url,
            productName=product.productName,
            score=raw.get("score", 50),
            scoreBreakdown=ScoreBreakdown(**raw.get("scoreBreakdown", {})),
            strengths=raw.get("strengths", []),
            limitations=raw.get("limitations", []),
            topReviews=TopReviews(
                positive=ReviewItem(**raw["topReviews"]["positive"])
                    if raw.get("topReviews", {}).get("positive") else None,
                critical=ReviewItem(**raw["topReviews"]["critical"])
                    if raw.get("topReviews", {}).get("critical") else None,
                balanced=ReviewItem(**raw["topReviews"]["balanced"])
                    if raw.get("topReviews", {}).get("balanced") else None,
            ),
            recommendation=raw.get("recommendation", ""),
            alternativeSearchQuery=raw.get("alternativeSearchQuery", ""),
        )

        yield f"data: {json.dumps({'type': 'result', 'data': result.model_dump()})}\n\n"

    except (json.JSONDecodeError, KeyError, TypeError) as e:
        yield f"data: {json.dumps({'type': 'error', 'message': f'Failed to parse Gemini response: {e}'})}\n\n"

    yield "data: [DONE]\n\n"
