/**
 * content/index.js — ShopSense AI Content Script (Phase 2)
 *
 * Flow:
 *  1. Detect platform from hostname + URL pattern
 *  2. Load selector registry (chrome.storage cache → bundled fallback)
 *  3. Run platform-specific scraper → full ProductData
 *  4. Send result to background service worker
 *  5. In background, refresh registry from remote CDN for next visit
 */

import { MSG, buildMsg } from '../utils/messaging.js'
import bundledRegistry from './scrapers/registry.json'

// ─── Remote registry config ──────────────────────────────────────────────────
// Update this URL when you deploy a newer registry.json to your CDN / GitHub raw
const REMOTE_REGISTRY_URL =
  'https://raw.githubusercontent.com/prajwal2403/Shopsence-AI/main/extension/src/content/scrapers/registry.json'
const REGISTRY_CACHE_KEY = 'shopsense_registry'
const REGISTRY_TTL_MS = 6 * 60 * 60 * 1000  // 6 hours

// ─── Platform rules ──────────────────────────────────────────────────────────

const PLATFORM_RULES = [
  {
    platform: 'amazon',
    hostname: /amazon\.(in|com)$/,
    registryKey: (host) => host.includes('amazon.in') ? 'amazon.in' : 'amazon.com',
    isProduct: () =>
      /\/dp\/[A-Z0-9]{10}/.test(location.pathname) ||
      /\/gp\/product\/[A-Z0-9]{10}/.test(location.pathname),
    scraper: () => import('./scrapers/amazon.js'),
  },
  {
    platform: 'flipkart',
    hostname: /flipkart\.com$/,
    registryKey: () => 'flipkart.com',
    isProduct: () =>
      location.pathname.startsWith('/p/') ||
      !!document.querySelector('[class*="pdp"], [class*="product-page"]'),
    scraper: () => import('./scrapers/flipkart.js'),
  },
  {
    platform: 'myntra',
    hostname: /myntra\.com$/,
    registryKey: () => 'myntra.com',
    isProduct: () => /\/[a-z-]+\/p\/\d+/.test(location.pathname),
    scraper: () => import('./scrapers/myntra.js'),
  },
  {
    platform: 'meesho',
    hostname: /meesho\.com$/,
    registryKey: () => 'meesho.com',
    isProduct: () => location.pathname.includes('/product/'),
    scraper: null,  // Phase 3 — uses generic fallback below
  },
  {
    platform: 'nykaa',
    hostname: /nykaa\.com$/,
    registryKey: () => 'nykaa.com',
    isProduct: () => location.pathname.includes('/p/') || location.pathname.includes('/buy/'),
    scraper: null,
  },
  {
    platform: 'snapdeal',
    hostname: /snapdeal\.com$/,
    registryKey: () => 'snapdeal.com',
    isProduct: () => location.pathname.startsWith('/product/'),
    scraper: null,
  },
]

// ─── Registry loader ─────────────────────────────────────────────────────────

/**
 * Load selector registry.
 * Priority: chrome.storage cached (< 6hr) → bundled JSON
 * Then async: fetch remote and update cache for next visit.
 */
async function loadRegistry() {
  try {
    const stored = await chrome.storage.local.get(REGISTRY_CACHE_KEY)
    const entry = stored[REGISTRY_CACHE_KEY]
    if (entry && Date.now() - entry.cachedAt < REGISTRY_TTL_MS) {
      // Fresh cached version available — use it and refresh in background
      refreshRegistryInBackground()
      return entry.data
    }
  } catch { /* storage unavailable */ }

  // No fresh cache → use bundled version and try to fetch remote
  refreshRegistryInBackground()
  return bundledRegistry
}

/**
 * Fetch the remote registry and update chrome.storage — fire and forget.
 */
function refreshRegistryInBackground() {
  fetch(REMOTE_REGISTRY_URL, { cache: 'no-cache' })
    .then(r => r.json())
    .then(data => {
      chrome.storage.local.set({
        [REGISTRY_CACHE_KEY]: { data, cachedAt: Date.now() },
      })
    })
    .catch(() => { /* Network unavailable — stay on bundled */ })
}

// ─── Generic fallback scraper ─────────────────────────────────────────────────
// Used for platforms without a dedicated scraper yet (Meesho, Nykaa, Snapdeal)

function genericScrape(platform, sel) {
  const { $, $all, text, cleanPrice, extractStars, safeInt, parseStockStatus, extractReviews, extractTableSpecs } =
    // Inline minimal helpers for generic fallback
    (() => {
      const q = (s) => { try { return document.querySelector(s) } catch { return null } }
      const qa = (s) => { try { return Array.from(document.querySelectorAll(s)) } catch { return [] } }
      return {
        $: q,
        $all: qa,
        text: (s) => q(s)?.textContent?.trim() || '',
        cleanPrice: (r) => { const n = parseFloat((r || '').replace(/[^0-9.]/g, '')); return isNaN(n) ? null : n },
        extractStars: (r) => { const m = (r || '').match(/(\d+\.?\d*)/); const n = parseFloat(m?.[1]); return isNaN(n) ? null : Math.min(n, 5) },
        safeInt: (r) => { const n = parseInt((r || '').replace(/[^0-9]/g, ''), 10); return isNaN(n) ? null : n },
        parseStockStatus: () => 'unknown',
        extractReviews: () => [],
        extractTableSpecs: () => ({}),
      }
    })()

  return {
    platform,
    url: location.href,
    productName: text(sel?.productName) || document.title.split('|')[0].trim(),
    price: cleanPrice(text(sel?.price)),
    currency: 'INR',
    rating: extractStars(text(sel?.rating)),
    reviewCount: safeInt(text(sel?.reviewCount)),
    topReviews: [],
    specs: {},
    sellerName: '',
    returnPolicy: '',
    deliveryEstimate: '',
    stockStatus: 'unknown',
    imageUrl: q(sel?.imageUrl)?.src || '',
  }
}

// ─── Main scrape entry ───────────────────────────────────────────────────────

async function scrapeAndSend() {
  const host = location.hostname

  // Find matching platform rule
  const rule = PLATFORM_RULES.find(r => r.hostname.test(host))
  if (!rule) return  // Not a supported site

  if (!rule.isProduct()) {
    chrome.runtime.sendMessage(buildMsg(MSG.NOT_PRODUCT_PAGE))
    return
  }

  // Load registry
  const registry = await loadRegistry()
  const regKey = rule.registryKey(host)
  const sel = registry[regKey] || {}

  let productData

  if (rule.scraper) {
    // Platform has a dedicated scraper
    try {
      const mod = await rule.scraper()
      productData = mod.scrape(sel)
    } catch (e) {
      console.warn('[ShopSense] Scraper error, falling back to generic:', e)
      productData = genericScrape(rule.platform, sel)
    }
  } else {
    // Generic fallback for platforms without a dedicated scraper yet
    productData = genericScrape(rule.platform, sel)
  }

  // ── Debug: print scraped data to the page console ────────────────────────
  console.group('%c[ShopSense AI] Scraped ProductData', 'color:#6366F1;font-weight:bold')
  console.log('Platform  :', productData.platform)
  console.log('Name      :', productData.productName)
  console.log('Price     :', productData.price, productData.currency)
  console.log('Rating    :', productData.rating, '/ 5')
  console.log('Reviews   :', productData.reviewCount)
  console.log('Stock     :', productData.stockStatus)
  console.log('Delivery  :', productData.deliveryEstimate)
  console.log('Seller    :', productData.sellerName)
  console.log('Specs     :', productData.specs)
  console.log('Top Reviews:', productData.topReviews)
  console.log('Full object:', productData)
  console.groupEnd()

  chrome.runtime.sendMessage(buildMsg(MSG.SCRAPE_RESULT, productData))
}

// ─── Listen for background-initiated scrape ──────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === MSG.INIT_SCRAPER) {
    scrapeAndSend().then(() => sendResponse({ ok: true }))
    return true  // async response
  }
})

// ─── Auto-run on page load ───────────────────────────────────────────────────

scrapeAndSend()
