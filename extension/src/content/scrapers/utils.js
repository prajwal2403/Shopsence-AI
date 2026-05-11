/**
 * utils.js — Shared DOM helpers for all ShopSense scrapers.
 *
 * Keep this file small and side-effect free.
 */

// ─── DOM Queries ──────────────────────────────────────────────────────────────

/** querySelector with null-safety */
export const $ = (selector, root = document) => {
  if (!selector) return null
  // Multiple fallback selectors separated by " || "
  const parts = selector.split(' || ')
  for (const part of parts) {
    try {
      const el = root.querySelector(part.trim())
      if (el) return el
    } catch { /* invalid selector */ }
  }
  return null
}

/** querySelectorAll → real Array, supports " || " fallback selectors */
export const $all = (selector, root = document) => {
  if (!selector) return []
  const parts = selector.split(' || ')
  for (const part of parts) {
    try {
      const els = Array.from(root.querySelectorAll(part.trim()))
      if (els.length > 0) return els
    } catch { /* invalid selector */ }
  }
  return []
}

/** Safe text content from first matching element */
export const text = (selector, root = document) =>
  $(selector, root)?.textContent?.trim() || ''

// ─── Value parsers ────────────────────────────────────────────────────────────

/**
 * Extract numeric price from a string like "₹1,299" or "1,299.00".
 * Returns null if nothing parseable is found.
 */
export function cleanPrice(raw) {
  if (!raw) return null
  const digits = raw.replace(/[^0-9.]/g, '')
  const n = parseFloat(digits)
  return isNaN(n) ? null : n
}

/**
 * Parse a star rating from strings like:
 *   "4.1 out of 5 stars"  →  4.1
 *   "4.1"                  →  4.1
 *   "4,1"                  →  4.1  (European locale)
 */
export function extractStars(raw) {
  if (!raw) return null
  const match = raw.match(/(\d+[.,]\d+|\d+)\s*(?:out of|\/)?/i)
  if (!match) return null
  const n = parseFloat(match[1].replace(',', '.'))
  return isNaN(n) ? null : Math.min(n, 5)
}

/**
 * Parse an integer from a messy string like "1,234 ratings" → 1234.
 */
export function safeInt(raw) {
  if (!raw) return null
  const digits = raw.replace(/[^0-9]/g, '')
  const n = parseInt(digits, 10)
  return isNaN(n) ? null : n
}

// ─── Stock status helper ──────────────────────────────────────────────────────

/**
 * Map a raw availability string to a canonical stock status.
 */
export function parseStockStatus(raw = '') {
  const s = raw.toLowerCase()
  if (s.includes('out of stock') || s.includes('unavailable') || s.includes('sold out'))
    return 'out_of_stock'
  if (s.includes('only') || s.includes('hurry') || s.includes('few left') || s.includes('limited'))
    return 'limited'
  if (s.includes('in stock') || s.includes('available') || s.includes('add to cart'))
    return 'in_stock'
  return 'unknown'
}

// ─── Review helpers ───────────────────────────────────────────────────────────

/**
 * Build a ReviewItem from an element using per-site child selectors.
 * Returns null if the element has no useful text.
 */
export function extractReview(el, sel) {
  const body = text(sel.reviewBody, el) || text(sel.reviewBody?.split(',')[0], el)
  if (!body) return null

  return {
    author: text(sel.reviewAuthor, el),
    rating: extractStars(text(sel.reviewRating, el)),
    title: text(sel.reviewTitle, el),
    body,
    verified: !!$(sel.reviewVerified, el),
    date: text(sel.reviewDate, el),
  }
}

/**
 * Extract up to `limit` reviews from the page using the registry selectors.
 */
export function extractReviews(sel, limit = 10) {
  return $all(sel.reviewItems)
    .slice(0, limit)
    .map(el => extractReview(el, sel))
    .filter(Boolean)
}

// ─── Spec helpers ─────────────────────────────────────────────────────────────

/**
 * Extract key-value specs from a <table> via rows of <th>/<td>.
 */
export function extractTableSpecs(tableSelector) {
  const specs = {}
  $all(tableSelector).forEach(row => {
    const cells = row.querySelectorAll('td, th')
    if (cells.length >= 2) {
      const k = cells[0].textContent.trim().replace(/\s+/g, ' ')
      const v = cells[1].textContent.trim().replace(/\s+/g, ' ')
      if (k && v && k.length < 80) specs[k] = v
    }
  })
  return specs
}

/**
 * Extract specs from bullet-point lists: "Key : Value" format.
 */
export function extractBulletSpecs(bulletSelector) {
  const specs = {}
  $all(bulletSelector).forEach(el => {
    const t = el.textContent.trim().replace(/\s+/g, ' ')
    const colonIdx = t.indexOf(':')
    if (colonIdx > 0 && colonIdx < 60) {
      const k = t.slice(0, colonIdx).trim()
      const v = t.slice(colonIdx + 1).trim()
      if (k && v) specs[k] = v.slice(0, 200)
    }
  })
  return specs
}
