"""
schemas.py — Pydantic request / response models for the ShopSense AI API.
"""

from typing import Optional
from pydantic import BaseModel, Field


# ─── Inbound (from extension) ─────────────────────────────────────────────────

class ReviewItem(BaseModel):
    author: str = ""
    rating: Optional[float] = None
    title: str = ""
    body: str = ""
    verified: bool = False
    date: str = ""


class ProductData(BaseModel):
    """
    Scraped product information sent from the browser extension.
    Phase 1 sends a minimal subset; Phase 2 fills in all fields.
    """
    platform: str = Field(..., description="amazon | flipkart | myntra | meesho | nykaa | snapdeal")
    url: str = Field(..., description="Canonical product URL")
    productName: str = ""
    price: Optional[float] = None
    currency: str = "INR"
    rating: Optional[float] = None        # 0–5
    reviewCount: Optional[int] = None
    topReviews: list[ReviewItem] = []
    specs: dict[str, str] = {}
    sellerName: str = ""
    returnPolicy: str = ""
    deliveryEstimate: str = ""
    stockStatus: str = "unknown"          # in_stock | limited | out_of_stock | unknown
    imageUrl: str = ""
    _phase: int = 1                       # scraping phase that produced this data


# ─── Outbound (to extension) ──────────────────────────────────────────────────

class ScoreBreakdown(BaseModel):
    priceValue: int = Field(0, ge=0, le=25)
    ratingsQuality: int = Field(0, ge=0, le=20)
    reviewAuthenticity: int = Field(0, ge=0, le=20)
    brandReputation: int = Field(0, ge=0, le=15)
    specCompleteness: int = Field(0, ge=0, le=10)
    deliveryAvailability: int = Field(0, ge=0, le=10)


class TopReviews(BaseModel):
    positive: Optional[ReviewItem] = None
    critical: Optional[ReviewItem] = None
    balanced: Optional[ReviewItem] = None


class AnalysisResult(BaseModel):
    platform: str
    url: str
    productName: str
    score: int = Field(..., ge=0, le=100)
    scoreBreakdown: ScoreBreakdown
    strengths: list[str] = []
    limitations: list[str] = []
    topReviews: TopReviews = TopReviews()
    recommendation: str = ""
    alternativeSearchQuery: str = ""
