/**
 * myntra.js — DOM scraper for Myntra product pages
 *
 * Myntra is a fashion-first platform; products don't always have numeric specs.
 * We focus on name, price, rating, reviews, and product description bullets.
 */

import {
  $, $all, text, cleanPrice, extractStars, safeInt,
  parseStockStatus, extractReviews, extractTableSpecs,
} from './utils.js'

/**
 * @param {Object} sel – selectors from registry for myntra.com
 * @returns {Object} ProductData
 */
export function scrape(sel) {
  // ── Product name ────────────────────────────────────────────────────────────
  // Myntra structures name as "<Brand> <Product Title>"
  const nameEl = $(sel.productName)
  const productName = nameEl?.textContent?.trim()
    || document.title.split('|')[0].trim()

  // ── Price ───────────────────────────────────────────────────────────────────
  // Myntra shows discounted price prominently
  let price = cleanPrice(text(sel.price))

  if (!price) {
    // Search meta tags as fallback (Myntra populates og:price:amount)
    const metaPrice = document.querySelector('meta[property="product:price:amount"]')
    price = cleanPrice(metaPrice?.content)
  }

  // ── MRP ─────────────────────────────────────────────────────────────────────
  const mrp = cleanPrice(text(sel.mrp))

  // ── Rating ──────────────────────────────────────────────────────────────────
  // Myntra shows "4.2" inside a div
  let rating = null
  const ratingText = text(sel.rating)
  const ratingNum = parseFloat(ratingText.match(/(\d+\.?\d*)/)?.[1] || '')
  if (!isNaN(ratingNum) && ratingNum > 0) rating = Math.min(ratingNum, 5)

  // ── Review count ────────────────────────────────────────────────────────────
  const reviewCount = safeInt(text(sel.reviewCount))

  // ── Stock status ────────────────────────────────────────────────────────────
  // Myntra shows "SIZE OUT OF STOCK" or size picker availability
  const sizesBtns = $all('.size-buttons-size-button, .sizeSelectorDesktop__sizeBtn')
  const hasAvailableSize = sizesBtns.some(btn =>
    !btn.classList.toString().toLowerCase().includes('out') &&
    !btn.classList.toString().toLowerCase().includes('disabled')
  )
  const stockStatus = sizesBtns.length === 0
    ? parseStockStatus(text(sel.availability))
    : hasAvailableSize ? 'in_stock' : 'out_of_stock'

  // ── Seller ──────────────────────────────────────────────────────────────────
  const sellerName = text(sel.sellerName)

  // ── Image ───────────────────────────────────────────────────────────────────
  const imgEl = $(sel.imageUrl)
  const imageUrl = imgEl?.src || imgEl?.getAttribute('data-src') || ''

  // ── Specs ───────────────────────────────────────────────────────────────────
  // Myntra uses a product description table for fashion attributes
  const specs = extractTableSpecs(sel.specTable)

  // Also grab product description bullets for non-fashion info
  $all('.pdp-product-description-content li, .pdp-description-item').forEach((el, i) => {
    const val = el.textContent.trim().replace(/\s+/g, ' ')
    if (val && val.length < 300) specs[`Detail ${i + 1}`] = val
  })

  // Delivery estimate from meta if available
  const deliveryEstimate = text('._2ZKZf') || ''

  // ── Reviews ─────────────────────────────────────────────────────────────────
  const topReviews = extractReviews(sel, 10)

  // ── Return policy ──────────────────────────────────────────────────────────
  // Myntra typically shows "15 day returns" in the exchange/returns section
  const returnPolicy = text('.return-period, .pdp-returns-exchange')
    || text('[class*="returnPeriod"]')

  return {
    platform: 'myntra',
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
    _mrp: mrp,
  }
}
