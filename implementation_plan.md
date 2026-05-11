# ShopSense AI — Browser Extension Implementation Plan

A Manifest V3 browser extension that visits any product page and delivers an instant AI-powered score, pros/cons, curated reviews, and smarter alternatives — all inside a sleek sidebar popup.

---

## Proposed Repository Layout

```
ShopSense AI/
├── extension/                   # The browser extension (Manifest V3)
│   ├── manifest.json
│   ├── public/
│   │   └── icons/               # 16 / 48 / 128 px icons
│   ├── src/
│   │   ├── background/
│   │   │   └── service_worker.js      # Handles API calls, caching, message routing
│   │   ├── content/
│   │   │   ├── index.js               # Content script entry — detects site, runs scraper
│   │   │   └── scrapers/
│   │   │       ├── registry.json      # Selector map per site (updatable remotely)
│   │   │       ├── amazon.js
│   │   │       ├── flipkart.js
│   │   │       └── myntra.js
│   │   ├── popup/                     # React sidebar popup
│   │   │   ├── index.html
│   │   │   ├── main.jsx
│   │   │   ├── App.jsx
│   │   │   └── components/
│   │   │       ├── ScoreRing.jsx
│   │   │       ├── FactorBreakdown.jsx
│   │   │       ├── StrengthsLimitations.jsx
│   │   │       ├── ReviewCards.jsx
│   │   │       ├── Recommendations.jsx
│   │   │       ├── LoadingSkeleton.jsx
│   │   │       └── ErrorState.jsx
│   │   └── utils/
│   │       ├── cache.js               # chrome.storage.local helpers
│   │       └── messaging.js           # Type-safe message bus helpers
│   └── vite.config.js                 # Vite + crxjs plugin for MV3
│
├── backend/                           # FastAPI proxy server
│   ├── main.py
│   ├── routes/
│   │   ├── analyze.py                 # POST /api/analyze
│   │   └── health.py
│   ├── services/
│   │   ├── claude_service.py          # Claude API calls + prompt templates
│   │   └── cache_service.py           # Redis / in-memory response cache
│   ├── models/
│   │   └── schemas.py                 # Pydantic request/response models
│   ├── requirements.txt
│   └── vercel.json / railway.toml
│
└── README.md
```

---

## Architecture Diagram

```
Product Page (Amazon / Flipkart / Myntra)
        │
        ▼
[Content Script]  ─── DOM scrape ───▶  structured product data
        │
        │  chrome.runtime.sendMessage
        ▼
[Background Service Worker]
        │  checks chrome.storage.local cache (24hr TTL)
        │  on miss → fetch() to backend proxy
        ▼
[FastAPI Backend on Vercel/Railway]
        │  builds prompt, calls Claude Sonnet
        ▼
[Claude API]  ──── streaming JSON response ────▶  score + pros/cons + reviews + recommendations
        │
        ▼  (result cached in chrome.storage.local)
[Popup (React)]  ─── renders ScoreRing, panels, cards
```

---

## Phase-by-Phase Plan

### Phase 1 — Extension Scaffolding

#### [NEW] `extension/manifest.json`
Manifest V3 with:
- `side_panel` permission (Chrome 114+) for sidebar popup
- `storage`, `activeTab`, `scripting` permissions
- Content script matching patterns for Amazon/Flipkart/Myntra
- Background service worker declaration
- Host permissions for the backend API origin

#### [NEW] `extension/vite.config.js`
Using the **crxjs** Vite plugin (`@crxjs/vite-plugin`) which natively handles MV3 HMR, auto-bundles content/background scripts, and outputs a ready-to-load `dist/` folder.

#### [NEW] `extension/src/background/service_worker.js`
- Message handler: receives `SCRAPE_DONE` from content script, checks cache, calls backend
- `chrome.storage.local` cache with 24-hour TTL keyed on normalized product URL
- Streams response chunks back to popup via `chrome.runtime.sendMessage`

#### [NEW] `extension/src/content/index.js`
- Detects current hostname → picks correct scraper
- Runs scraper → sends `SCRAPE_DONE` message to service worker
- Injects nothing into the page DOM (zero visual footprint on product page)

#### [NEW] `extension/src/popup/` (React + Tailwind)
- Scaffold with loading, error, and success states
- Opens as a Chrome Side Panel (preferred) with fallback to popup window

---

### Phase 2 — Site-Specific Scrapers

Each scraper returns a **standardised `ProductData` object**:

```js
{
  platform: "amazon",
  productName: String,
  price: Number,
  currency: "INR",
  rating: Number,          // 0–5
  reviewCount: Number,
  topReviews: [{ author, rating, title, body, verified, date }],
  specs: { key: value },   // Key specifications
  sellerName: String,
  returnPolicy: String,
  deliveryEstimate: String,
  stockStatus: "in_stock" | "limited" | "out_of_stock",
  imageUrl: String,
  url: String,
}
```

#### [NEW] `extension/src/content/scrapers/registry.json`
Remote-updatable selector map. The content script fetches this from a CDN URL at startup (with local fallback) so selectors can be hot-patched without a new extension release.

```json
{
  "amazon.in": {
    "productName": "#productTitle",
    "price": ".a-price-whole",
    "rating": "#acrPopover .a-size-base",
    ...
  },
  "flipkart.com": { ... },
  "myntra.com": { ... }
}
```

#### [NEW] Scrapers: `amazon.js`, `flipkart.js`, `myntra.js`
- Pull selectors from registry
- Graceful fallback if a selector is missing (partial data still sent)
- Review extraction: grabs first 8–10 reviews from the page DOM

---

### Phase 3 — AI Scoring Pipeline (Backend)

#### [NEW] `backend/services/claude_service.py`

**Prompt template** sends structured product JSON to Claude and demands a structured JSON response:

```
Given this product data from {platform}:
{product_json}

Return a JSON object with exactly this shape:
{
  "score": 0-100,
  "scoreBreakdown": {
    "priceValue": 0-25,
    "ratingsQuality": 0-20,
    "reviewAuthenticity": 0-20,
    "brandReputation": 0-15,
    "specCompleteness": 0-10,
    "deliveryAvailability": 0-10
  },
  "strengths": ["...", "...", "..."],
  "limitations": ["...", "...", "..."],
  "topReviews": {
    "positive": { ... },
    "critical": { ... },
    "balanced": { ... }
  },
  "recommendation": "...",
  "alternativeSearchQuery": "..."
}
```

- Uses `claude-sonnet-4-5` (or `claude-sonnet-4`) streaming
- Server-sent events (SSE) stream chunks back to the extension

#### [NEW] `backend/routes/analyze.py`
- `POST /api/analyze` — accepts `ProductData`, returns SSE stream
- Lightweight HMAC-based request signing (extension sends a shared secret header) to prevent abuse
- Rate limiting: 20 requests/hour per extension install ID

#### [NEW] `backend/services/cache_service.py`
- In-memory LRU cache (or Redis on Railway) keyed on `hash(url + date)`
- 24-hour TTL; returns cached response instantly

---

### Phase 4 — UI Design (React + Tailwind)

The popup will be a **side panel** (400px wide, full viewport height).

#### Layout (top → bottom)

1. **Header bar** — ShopSense logo + platform badge + "Analyzing…" status indicator
2. **Score Ring** — Animated SVG circular gauge 0–100, colour-coded:
   - 80–100 → Emerald green (Excellent)
   - 60–79 → Amber (Good)
   - 40–59 → Orange (Fair)
   - 0–39 → Red (Poor)
3. **Factor Breakdown** — 6 horizontal bars with label + score/max
4. **Strengths & Limitations** — Two-column pill grid, green/red colour-coded
5. **Top Reviews** — Three review cards (Positive / Critical / Balanced tabs)
6. **Recommendations** — "Consider instead:" carousel card with search link
7. **Footer** — Cache age ("Analysed 2 hours ago"), refresh button, settings cog

#### Component highlights

| Component | Key behaviour |
|---|---|
| `ScoreRing` | CSS + SVG animation on mount, score counter ticks up |
| `LoadingSkeleton` | Pulsing skeleton cards while streaming |
| `StrengthsLimitations` | Pills fade in staggered with framer-motion |
| `ReviewCards` | Tabbed panel, review body truncated with expand |
| `Recommendations` | Horizontal scroll carousel |

**Design tokens:**
- Font: Inter (Google Fonts)
- Dark mode primary (`#0f172a` slate-900 bg, `#1e293b` cards)
- Accent: `#6366f1` indigo-500
- Score ring stroke: dynamic HSL based on score value

---

### Phase 5 — Extension Store Submission

#### Assets needed
- Icons: 16×16, 48×48, 128×128 (`.png`)
- Screenshots: 1280×800 (Chrome Web Store), 2560×1600 (Edge Add-ons)
- Privacy Policy page (GitHub Pages or Vercel static)
- Promotional tile: 440×280

#### Listing copy (draft)
- **Name**: ShopSense AI
- **Tagline**: "Instant AI product ratings before you buy"
- **Category**: Shopping
- **Permissions explanation**: Only reads publicly visible product data; no personal data stored on any server.

---

## Key Design Decisions

> [!IMPORTANT]
> **Side Panel vs Popup**: Using `chrome.sidePanel` API (Chrome 114+) gives a persistent sidebar experience without re-triggering analysis on close. Fallback to `action.popup` for Firefox + older Chrome.

> [!IMPORTANT]
> **Remote Selector Registry**: The `registry.json` is fetched from a GitHub raw URL / CDN at startup (with IndexedDB cache). This is the single most important resilience mechanism — Amazon HTML updates won't break the extension between releases.

> [!WARNING]
> **Claude API Key Security**: The Claude key is NEVER in the extension. All calls go through our FastAPI proxy. The proxy validates requests with a per-install HMAC token derived from `chrome.runtime.id`.

> [!NOTE]
> **Firefox Compatibility**: MV3 is supported in Firefox 109+. Key differences: `browser.*` API namespace (handled via `webextension-polyfill`), no `chrome.sidePanel` (falls back to popup), and slightly different CSP rules.

---

## Open Questions

> [!IMPORTANT]
> **Backend hosting**: Do you want to deploy the FastAPI proxy to **Vercel** (serverless, free tier but cold starts) or **Railway** (always-on, small monthly cost)? Railway is better for SSE streaming.

> [!IMPORTANT]
> **Claude API Key**: Do you already have a Claude API key? I'll need to know where to wire it in (`.env` on the backend).

> [!NOTE]
> **Phase scope for first build**: I plan to build **all 5 phases end-to-end** in one go to give you a complete, runnable extension. Is that the right approach, or do you want phase-by-phase delivery with review between phases?

> [!NOTE]
> **Firefox-first or Chrome-first?** I'll target Chrome/Edge as primary and add Firefox compatibility shims. Let me know if Firefox should be the priority.

---

## Verification Plan

### Automated
- `npm run build` in `extension/` — zero errors, valid `dist/` folder
- `uvicorn main:app` in `backend/` — server starts, `/health` returns 200
- Load unpacked extension in Chrome → navigate to an Amazon product → popup opens and shows skeleton → score populates

### Manual
- Test on: Amazon.in product page, Flipkart product page, Myntra product page
- Test cache: revisit same page → result loads instantly without API call
- Test error state: navigate to a non-product page → graceful "Not a product page" message
