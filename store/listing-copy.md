# ShopSense AI — Chrome Web Store Listing Copy

## Basic Info

| Field | Value |
|---|---|
| **Name** | ShopSense AI |
| **Category** | Shopping |
| **Language** | English |
| **Version** | 1.0.0 |

---

## Short Description
*(132 characters max)*

```
Instant AI product ratings, pros/cons, and review summaries before you buy — on Amazon, Flipkart, Myntra & more.
```

---

## Detailed Description
*(Max 16,000 characters — paste this verbatim into the store form)*

```
ShopSense AI gives you an instant, unbiased AI-powered verdict on any product — right in a sleek Chrome side panel — before you hit "Add to Cart."

🧠 HOW IT WORKS

Open ShopSense AI on any supported product page. The extension reads publicly visible product data (title, price, rating, reviews, specs) and sends it to our AI backend. Within seconds you get a 0–100 score, a detailed breakdown, curated reviews, and smarter alternatives.

No account needed. No personal data collected. Works instantly.

---

📊 SMART PRODUCT SCORING

Every product gets a 0–100 Trust Score built from 6 weighted factors:

• Price / Value (25 pts) — Is this price competitive for the category?
• Ratings Quality (20 pts) — Are the stars backed by enough reviews?
• Review Authenticity (20 pts) — Fake review detection: clusters, unverified accounts, generic praise
• Brand Reputation (15 pts) — Known brand? Clear warranty and after-sales?
• Spec Completeness (10 pts) — Are all key specs disclosed?
• Delivery & Availability (10 pts) — In stock? Fast shipping?

Score colours: 🟢 80–100 Excellent · 🟡 60–79 Good · 🟠 40–59 Fair · 🔴 0–39 Poor

---

✅ STRENGTHS & ⚠️ LIMITATIONS

ShopSense AI reads between the lines of reviews and specs to surface:

Strengths — What customers genuinely love, backed by specific review quotes
Limitations — What reviewers consistently complain about

No generic fluff. Every insight is grounded in actual product data.

---

💬 AI-CURATED REVIEWS

Reading 200 reviews is impossible. ShopSense AI picks the three most informative ones:

👍 Best Positive — most helpful enthusiastic review
👎 Best Critical — most informative complaint
⚖️ Best Balanced — most nuanced, honest assessment

---

🔁 SMARTER ALTERNATIVES

Not impressed? ShopSense AI generates a tailored search query to help you find a better product in the same category and price range — with direct links to Amazon, Flipkart, and more.

---

🛡️ PRIVACY FIRST

• Reads ONLY publicly visible page content — nothing behind logins
• Zero personal data collected, stored, or shared
• Results cached locally in your browser (24hr), never on a server
• Claude API key is server-side only — never in the extension
• Full privacy policy: https://prajwal2403.github.io/Shopsence-AI/privacy-policy/

---

🌐 SUPPORTED PLATFORMS

• Amazon.in / Amazon.com
• Flipkart
• Myntra
• Meesho
• Nykaa
• Snapdeal

More platforms coming soon — Ajio, Croma, Tata CLiQ.

---

⚡ POWERED BY GROQ AI

ShopSense AI uses Groq's ultra-fast inference API with Llama 3.3 70B for near-instant product analysis — typically under 3 seconds.

---

🔒 PERMISSIONS EXPLAINED

• activeTab — reads the product page you're viewing (only when you open ShopSense AI)
• storage — caches your analysis for 24 hours so repeat visits load instantly
• scripting — injects the page reader to extract product data
• sidePanel — displays the ShopSense AI panel in Chrome's sidebar

ShopSense AI will NEVER: access your browsing history, read pages you haven't asked it to analyse, collect personal data, or run in the background without your action.

---

Made with ❤️ for smarter shoppers.
```

---

## Screenshots Order (Chrome Web Store — upload in this order)

1. `screenshot_01_in_action.png` — Extension live on Amazon product page (1280×800)
2. `screenshot_02_score_ring.png` — Score ring feature highlight (1280×800)
3. `screenshot_03_reviews.png` — Review analysis feature (1280×800)

---

## Edge Add-ons Listing

Edge uses the same text. For screenshots, scale to **2560×1600** (just resize the 1280×800 images at 2x).

---

## Permissions Justification
*(Paste into the "Why do you need this permission?" boxes)*

| Permission | Justification Text |
|---|---|
| `activeTab` | ShopSense AI reads product data (title, price, reviews) from the tab the user is currently viewing. Data is only read when the user explicitly opens the ShopSense AI side panel. No browsing history is accessed. |
| `storage` | Analysis results are cached in `chrome.storage.local` for 24 hours so returning to the same product page loads instantly without a repeat API call. No personal data is stored. |
| `scripting` | The content script is injected only into supported shopping sites (Amazon, Flipkart, Myntra, Meesho, Nykaa, Snapdeal) to extract publicly visible product data from the DOM. |
| `sidePanel` | ShopSense AI displays its analysis UI in Chrome's native side panel, allowing the user to view insights alongside the product page without covering it. |
| `host_permissions` (shopping sites) | Required for the content script to run on Amazon, Flipkart, Myntra, Meesho, Nykaa, and Snapdeal product pages. |

---

## Category Tags / Keywords

```
AI shopping assistant, product rating, fake review detector, amazon review checker,
flipkart product analysis, price value score, shopping helper, product comparison,
review summarizer, buy assistant, smart shopping, AI product review
```

---

## Developer Contact

- **Developer name**: ShopSense AI
- **GitHub**: https://github.com/prajwal2403/Shopsence-AI
- **Privacy Policy URL**: https://prajwal2403.github.io/Shopsence-AI/privacy-policy/
- **Support URL**: https://github.com/prajwal2403/Shopsence-AI/issues
