/**
 * flipkart.js — DOM scraper for Flipkart product pages
 *
 * Flipkart's React-rendered HTML uses hashed class names that change
 * frequently. The registry provides the current best selectors; this scraper
 * adds extra fallback logic for critical fields like price and rating.
 */

import {
  $, $all, text, cleanPrice, extractStars, safeInt,
  parseStockStatus, extractReviews, extractTableSpecs,
} from './utils.js'

/**
 * @param {Object} sel – selectors from registry for flipkart.com
 * @returns {Object} ProductData
 */
export function scrape(sel) {
  // ── Product name ────────────────────────────────────────────────────────────
  const productName = text(sel.productName)
    || document.querySelector('h1')?.textContent?.trim()
    || document.title.split('|')[0].trim()

  // ── Price ───────────────────────────────────────────────────────────────────
  // Flipkart shows price as "₹1,299" — strip currency symbol & commas
  let price = cleanPrice(text(sel.price))
  if (!price) {
    // Fallback: find first element containing ₹ that looks like a price
    const candidates = $all('span, div, p')
    for (const el of candidates) {
      if (el.children.length === 0 && el.textContent.includes('₹')) {
        const v = cleanPrice(el.textContent)
        if (v && v > 0) { price = v; break }
      }
    }
  }

  // ── MRP (original price before discount) ────────────────────────────────────
  const mrp = cleanPrice(text(sel.mrp))

  // ── Rating ──────────────────────────────────────────────────────────────────
  let rating = extractStars(text(sel.rating))
  // Flipkart sometimes puts "4.2" directly without "out of 5" text
  if (!rating) {
    const ratingRaw = text(sel.rating)
    const n = parseFloat(ratingRaw)
    if (!isNaN(n) && n >= 0 && n <= 5) rating = n
  }

  // ── Review count ────────────────────────────────────────────────────────────
  const reviewCount = safeInt(text(sel.reviewCount))

  // ── Stock status ────────────────────────────────────────────────────────────
  // Flipkart shows "Add to Cart" or "Out of Stock" button
  const addToCartBtn = document.querySelector('button._2KpZ6l._2U9uOA._3v1-ww')
    || document.querySelector('[class*="add-to-cart"]')
    || document.querySelector('button[class*="AddToCart"]')
  const outOfStockEl = document.querySelector('[class*="outOfStock"], ._16FRp0')
  const stockStatus = outOfStockEl
    ? 'out_of_stock'
    : addToCartBtn
    ? 'in_stock'
    : parseStockStatus(text(sel.availability))

  // ── Delivery ────────────────────────────────────────────────────────────────
  const deliveryEstimate = text(sel.deliveryDate)

  // ── Seller ──────────────────────────────────────────────────────────────────
  const sellerName = text(sel.sellerName)

  // ── Image ───────────────────────────────────────────────────────────────────
  const imgEl = $(sel.imageUrl)
  const imageUrl = imgEl?.src || imgEl?.getAttribute('src') || ''

  // ── Specs ───────────────────────────────────────────────────────────────────
  const specs = extractTableSpecs(sel.specTable)

  // Fallback: grab from any table on the page if spec table is empty
  if (Object.keys(specs).length < 2) {
    document.querySelectorAll('table tr').forEach(row => {
      const cells = row.querySelectorAll('td')
      if (cells.length >= 2) {
        const k = cells[0].textContent.trim()
        const v = cells[1].textContent.trim()
        if (k && v && k.length < 80) specs[k] = v.slice(0, 200)
      }
    })
  }

  // ── Reviews ─────────────────────────────────────────────────────────────────
  const topReviews = extractReviews(sel, 10)

  return {
    platform: 'flipkart',
    url: location.href,
    productName,
    price,
    currency: 'INR',
    rating,
    reviewCount,
    topReviews,
    specs,
    sellerName,
    returnPolicy: '',   // Flipkart shows this in a modal — not accessible via static DOM
    deliveryEstimate,
    stockStatus,
    imageUrl,
    // Extra Flipkart-specific fields passed for context
    _mrp: mrp,
  }
}
