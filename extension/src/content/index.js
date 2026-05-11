/**
 * content/index.js — ShopSense AI Content Script
 *
 * Injected into supported shopping sites. In Phase 1:
 *  - Detects if the current page is a product detail page
 *  - Identifies the platform
 *  - Sends basic page info to the background service worker
 *
 * Full DOM scraping (price, reviews, specs, etc.) added in Phase 2.
 */

import { MSG, buildMsg } from '../utils/messaging.js'

// ─── Platform Detection ───────────────────────────────────────────────────────

const PLATFORM_RULES = [
  {
    platform: 'amazon',
    hostname: /amazon\.(in|com)$/,
    isProduct: () => /\/dp\/[A-Z0-9]{10}/.test(location.pathname) ||
                     /\/gp\/product\/[A-Z0-9]{10}/.test(location.pathname),
  },
  {
    platform: 'flipkart',
    hostname: /flipkart\.com$/,
    isProduct: () => location.pathname.startsWith('/p/') ||
                     document.querySelector('[class*="product-title"]') !== null,
  },
  {
    platform: 'myntra',
    hostname: /myntra\.com$/,
    isProduct: () => /\/[a-z-]+\/p\/\d+/.test(location.pathname),
  },
  {
    platform: 'meesho',
    hostname: /meesho\.com$/,
    isProduct: () => location.pathname.includes('/product/'),
  },
  {
    platform: 'nykaa',
    hostname: /nykaa\.com$/,
    isProduct: () => location.pathname.includes('/p/'),
  },
  {
    platform: 'snapdeal',
    hostname: /snapdeal\.com$/,
    isProduct: () => location.pathname.startsWith('/product/'),
  },
]

function detectPlatform() {
  const host = location.hostname
  for (const rule of PLATFORM_RULES) {
    if (rule.hostname.test(host)) {
      return { platform: rule.platform, isProduct: rule.isProduct() }
    }
  }
  return null
}

// ─── Basic Phase-1 Scrape ─────────────────────────────────────────────────────

/**
 * Minimal product data for Phase 1. Returns a ProductData-compatible object
 * with only the fields extractable without per-site selectors.
 * Full extraction is added in Phase 2.
 */
function basicScrape(platform) {
  return {
    platform,
    url: location.href,
    productName: document.title.replace(/\s*[-|:]\s*.*$/, '').trim(),
    // Phase 2 will add: price, rating, reviewCount, topReviews, specs, etc.
    _phase: 1,
  }
}

// ─── Initialise ───────────────────────────────────────────────────────────────

function init() {
  const detection = detectPlatform()

  if (!detection) {
    // Not a supported site — content script still injected, just do nothing
    return
  }

  if (!detection.isProduct) {
    // Supported site but not a product page (e.g. category or home page)
    chrome.runtime.sendMessage(buildMsg(MSG.NOT_PRODUCT_PAGE))
    return
  }

  // It's a product page — scrape and send
  const data = basicScrape(detection.platform)
  chrome.runtime.sendMessage(buildMsg(MSG.SCRAPE_RESULT, data))
}

// ─── Listen for background → scrape request ───────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === MSG.INIT_SCRAPER) {
    const detection = detectPlatform()

    if (!detection || !detection.isProduct) {
      chrome.runtime.sendMessage(buildMsg(MSG.NOT_PRODUCT_PAGE))
    } else {
      const data = basicScrape(detection.platform)
      chrome.runtime.sendMessage(buildMsg(MSG.SCRAPE_RESULT, data))
    }

    sendResponse({ ok: true })
  }
})

// Run on page load
init()
