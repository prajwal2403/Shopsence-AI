- []

# ShopSense AI — Extension Store Submission Checklist

## Pre-Submission Build

- [ ] Run `npm run build` in `extension/` — confirm zero errors
- [ ] Zip `extension/dist/` as `shopsense-ai-v1.0.0.zip`
- [ ] Confirm `manifest.json` version matches `1.0.0`
- [ ] Confirm icons exist: `dist/icons/icon16.png`, `icon48.png`, `icon128.png`

---

## Chrome Web Store

### Account Setup
- [ ] Sign in at https://chrome.google.com/webstore/devconsole
- [ ] Pay one-time $5 developer registration fee (if not already done)

### Upload
- [ ] Click **Add new item**
- [ ] Upload `shopsense-ai-v1.0.0.zip`
- [ ] Wait for automated policy check to pass

### Store Listing — Product Store tab
- [ ] **Name**: ShopSense AI
- [ ] **Short description** (≤132 chars): paste from `store/listing-copy.md`
- [ ] **Detailed description**: paste full text from `store/listing-copy.md`
- [ ] **Category**: Shopping
- [ ] **Language**: English

### Graphics
- [ ] Upload **icon** (128×128 PNG): `extension/public/icons/icon128.png`
- [ ] Upload **promotional tile** (440×280 PNG): `store/assets/promo_tile_440x280.png`
- [ ] Upload **screenshot 1** (1280×800): `store/assets/screenshot_01_in_action.png`
- [ ] Upload **screenshot 2** (1280×800): `store/assets/screenshot_02_score_ring.png`
- [ ] Upload **screenshot 3** (1280×800): `store/assets/screenshot_03_reviews.png`

### Privacy
- [ ] **Single purpose description**: "ShopSense AI reads product data from supported shopping pages to generate an AI-powered product score, pros/cons analysis, and review summary."
- [ ] **Privacy policy URL**: `https://prajwal2403.github.io/Shopsence-AI/privacy-policy/`
- [ ] Check "This extension does not collect or use any user data" — **only if true after final review**
- [ ] Alternatively, fill the data use disclosure (host content, user activity — set to No for all)

### Permissions Justification
- [ ] Paste justification text for each permission from `store/listing-copy.md`

### Distribution
- [ ] **Visibility**: Public
- [ ] **Regions**: All regions (or select India + UK + US + AU for initial rollout)

### Submit
- [ ] Click **Submit for review**
- [ ] Review typically takes 1–3 business days

---

## Edge Add-ons (Microsoft)

- [ ] Sign in at https://partner.microsoft.com/dashboard/microsoftedge/
- [ ] Click **Create new extension**
- [ ] Upload same `shopsense-ai-v1.0.0.zip`
- [ ] Fill listing (same copy as Chrome — Edge accepts same format)
- [ ] Upload 2560×1600 screenshots (resize the 1280×800 images ×2)
- [ ] Set privacy policy URL same as Chrome
- [ ] Submit for review (usually faster than Chrome, 1–2 days)

---

## GitHub Pages — Privacy Policy Deploy

- [ ] Ensure `store/privacy-policy/index.html` is committed to `main`
- [ ] In GitHub repo Settings → Pages:
  - Source: **Deploy from branch**
  - Branch: `main`
  - Folder: `/store/privacy-policy`
- [ ] Wait ~2 minutes for deploy
- [ ] Verify at: `https://prajwal2403.github.io/Shopsence-AI/privacy-policy/`

---

## Post-Submission

- [ ] Tag the release: `git tag v1.0.0 && git push --tags`
- [ ] Update `README.md` with Chrome Web Store link once approved
- [ ] Set up Railway/Vercel environment variable `ALLOWED_ORIGINS` to the approved extension ID:
  ```
  ALLOWED_ORIGINS=chrome-extension://YOUR_EXTENSION_ID_HERE
  ```
- [ ] Monitor Chrome Web Store Developer Dashboard for review status

---

## Store Asset Files Reference

| File | Size | Status |
|---|---|---|
| `extension/public/icons/icon128.png` | 128×128 | ✅ Ready |
| `extension/public/icons/icon48.png` | 48×48 | ✅ Ready |
| `extension/public/icons/icon16.png` | 16×16 | ✅ Ready |
| `store/assets/promo_tile_440x280.png` | 440×280 | ⬜ Save from generated image |
| `store/assets/screenshot_01_in_action.png` | 1280×800 | ⬜ Save from generated image |
| `store/assets/screenshot_02_score_ring.png` | 1280×800 | ⬜ Save from generated image |
| `store/assets/screenshot_03_reviews.png` | 1280×800 | ⬜ Save from generated image |
| `store/privacy-policy/index.html` | — | ✅ Ready |
| `store/listing-copy.md` | — | ✅ Ready |
