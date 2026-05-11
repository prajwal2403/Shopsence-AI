/**
 * cache.js — chrome.storage.local cache helpers with 24-hour TTL
 *
 * Key format: `shopsense_cache_<normalizedUrl>`
 * Each entry: { data: AnalysisResult, cachedAt: timestamp }
 */

const CACHE_PREFIX = 'shopsense_cache_'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

// ─── URL Normalisation ────────────────────────────────────────────────────────

/**
 * Strip tracking params and fragments so the same product always
 * hits the same cache key regardless of UTM parameters.
 */
export function normaliseUrl(rawUrl) {
  try {
    const url = new URL(rawUrl)

    // Remove common tracking / session params
    const DROP_PARAMS = [
      'ref', 'ref_', 'tag', 'linkCode', 'camp', 'creative',
      'ascsubtag', 'smid', 'utm_source', 'utm_medium', 'utm_campaign',
      'utm_content', 'utm_term', 'ei', 'pf_rd_p', 'pf_rd_r',
    ]
    DROP_PARAMS.forEach((p) => url.searchParams.delete(p))
    url.hash = ''

    return url.toString()
  } catch {
    return rawUrl
  }
}

function cacheKey(url) {
  return `${CACHE_PREFIX}${normaliseUrl(url)}`
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Returns cached analysis result for a URL, or null if absent/expired.
 */
export async function getCached(url) {
  const key = cacheKey(url)
  const result = await chrome.storage.local.get(key)
  const entry = result[key]

  if (!entry) return null

  const age = Date.now() - entry.cachedAt
  if (age > CACHE_TTL_MS) {
    // Expired — clean up silently
    chrome.storage.local.remove(key)
    return null
  }

  return { ...entry.data, _cacheAge: age }
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Persist an analysis result keyed on the product URL.
 */
export async function setCached(url, data) {
  const key = cacheKey(url)
  await chrome.storage.local.set({
    [key]: { data, cachedAt: Date.now() },
  })
}

// ─── Invalidate ───────────────────────────────────────────────────────────────

/**
 * Force-remove a cached entry (e.g., user clicks "Re-analyse").
 */
export async function clearCached(url) {
  await chrome.storage.local.remove(cacheKey(url))
}

/**
 * Remove all ShopSense cache entries.
 */
export async function clearAllCache() {
  const all = await chrome.storage.local.get(null)
  const keys = Object.keys(all).filter((k) => k.startsWith(CACHE_PREFIX))
  if (keys.length > 0) {
    await chrome.storage.local.remove(keys)
  }
  return keys.length
}

// ─── Cache age helper ─────────────────────────────────────────────────────────

/**
 * Returns a human-readable cache age string, e.g. "2 hours ago".
 */
export function formatCacheAge(ageMs) {
  const minutes = Math.floor(ageMs / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
}
