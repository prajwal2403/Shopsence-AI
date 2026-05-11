/**
 * amazon.js — DOM scraper for Amazon India & Amazon.com
 *
 * Works for both amazon.in and amazon.com product pages.
 * Uses selectors from registry.json; falls back gracefully if any are missing.
 */

import {
  $, $all, text, cleanPrice, extractStars, safeInt,
  parseStockStatus, extractReviews, extractTableSpecs, extractBulletSpecs,
} from './utils.js'

/**
 * @param {Object} sel – selectors from registry for this hostname
 * @returns {Object} ProductData
 */
export function scrape(sel) {
  // ── Product name ────────────────────────────────────────────────────────────
  const productName = text(sel.productName) || document.title.split(':')[0].trim()

  // ── Price ───────────────────────────────────────────────────────────────────
  let price = null
  const whole = text(sel.priceWhole).replace(/[^0-9]/g, '')
  const frac  = text(sel.priceFraction).replace(/[^0-9]/g, '') || '00'

  if (whole) {
    price = parseFloat(`${whole}.${frac}`)
  } else {
    // Fallback: grab the first .a-offscreen inside a price block (screen-reader text)
    const offscreen = $all('.a-price .a-offscreen')[0]?.textContent
    price = cleanPrice(offscreen) ?? cleanPrice(text(sel.priceFallback))
  }

  // ── Rating ──────────────────────────────────────────────────────────────────
  const rating = extractStars(text(sel.rating))

  // ── Review count ────────────────────────────────────────────────────────────
  const reviewCount = safeInt(text(sel.reviewCount))

  // ── Stock status ────────────────────────────────────────────────────────────
  const stockStatus = parseStockStatus(text(sel.availability))

  // ── Delivery ────────────────────────────────────────────────────────────────
  const deliveryEstimate = text(sel.deliveryDate)

  // ── Seller ──────────────────────────────────────────────────────────────────
  const sellerName = text(sel.sellerName)

  // ── Return policy ───────────────────────────────────────────────────────────
  const returnPolicy = text(sel.returnPolicy)

  // ── Image ───────────────────────────────────────────────────────────────────
  const imgEl = $(sel.imageUrl)
  const imageUrl = imgEl?.getAttribute('data-old-hires')
    || imgEl?.getAttribute('data-a-dynamic-image')?.match(/"(https[^"]+)"/)?.[1]
    || imgEl?.src
    || ''

  // ── Specs ───────────────────────────────────────────────────────────────────
  const specs = {
    ...extractTableSpecs(sel.techSpecTable),
    ...extractBulletSpecs(sel.detailBullets),
  }

  // Add feature bullet points as numbered items if specs are sparse
  if (Object.keys(specs).length < 3) {
    $all(sel.bulletPoints)
      .map(el => el.textContent.trim().replace(/\s+/g, ' '))
      .filter(t => t.length > 10 && t.length < 300)
      .slice(0, 8)
      .forEach((t, i) => { specs[`Feature ${i + 1}`] = t })
  }

  // ── Reviews ─────────────────────────────────────────────────────────────────
  const topReviews = extractReviews(sel, 10)

  return {
    platform: 'amazon',
    url: location.href,
    productName,
    price,
    currency: 'INR',
    rating,
    reviewCount,
    topReviews,
    specs,
    sellerName,
    returnPolicy,
    deliveryEstimate,
    stockStatus,
    imageUrl,
  }
}
