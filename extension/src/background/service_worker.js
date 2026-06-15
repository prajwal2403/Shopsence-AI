/**
 * service_worker.js — ShopSense AI Background Service Worker (MV3)
 *
 * Responsibilities:
 *  1. Open the side panel when the extension action is clicked
 *  2. Route messages between the popup and content scripts
 *  3. Manage the 24-hour analysis cache
 *  4. Call the FastAPI backend and stream results to the popup
 */

import { MSG, buildMsg } from '../utils/messaging.js'
import { getCached, setCached, clearCached, clearAllCache } from '../utils/cache.js'

// ─── Configuration ────────────────────────────────────────────────────────────

// Set your deployed backend URL here, or keep localhost for development
const API_BASE = 'http://localhost:8000'

// ─── Popup port registry ──────────────────────────────────────────────────────
// Tracks open popup/side-panel connections so we can push updates

let popupPort = null

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'popup') {
    popupPort = port
    port.onDisconnect.addListener(() => { popupPort = null })
  }
})

function postToPopup(type, payload = {}) {
  if (popupPort) {
    popupPort.postMessage(buildMsg(type, payload))
  }
}

// ─── Installation ─────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async () => {
  console.log('[ShopSense] Extension installed.')

  // Open side panel when the toolbar icon is clicked
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
})

// ─── One-off message handler ──────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { type, payload } = message

  switch (type) {

    // ── Content script sends scraped product data ──────────────────────────
    case MSG.SCRAPE_RESULT: {
      handleScrapeResult(payload)
      sendResponse({ ok: true })
      break
    }

    // ── Content script says this isn't a product page ──────────────────────
    case MSG.NOT_PRODUCT_PAGE: {
      postToPopup(MSG.NOT_PRODUCT_PAGE, {})
      sendResponse({ ok: true })
      break
    }

    // ── Popup requests (or re-requests) analysis ───────────────────────────
    case MSG.REQUEST_ANALYSIS: {
      requestAnalysis(payload.tabId, payload.url, payload.forceRefresh)
        .then(() => sendResponse({ ok: true }))
        .catch((err) => sendResponse({ ok: false, error: err.message }))
      return true // keep channel open for async
    }

    // ── Popup requests cache clear for current URL ─────────────────────────
    case MSG.CLEAR_CACHE: {
      const target = payload.url ? clearCached(payload.url) : clearAllCache()
      target.then(() => sendResponse({ ok: true }))
      return true
    }

    default:
      break
  }
})

// ─── Core analysis flow ───────────────────────────────────────────────────────

/**
 * Called when a content script delivers scraped product data.
 * Checks cache → calls API if needed → streams result to popup.
 */
async function handleScrapeResult(productData) {
  const { url } = productData

  // Check cache first
  const cached = await getCached(url)
  if (cached) {
    console.log('[ShopSense] Cache hit for', url)
    postToPopup(MSG.CACHE_HIT, cached)
    return
  }

  // Nothing cached — call the API
  await callAnalysisApi(productData)
}

/**
 * Triggered by the popup when it opens. Fetches the active tab,
 * checks cache, or asks the content script to scrape.
 */
async function requestAnalysis(tabId, url, forceRefresh = false) {
  if (!forceRefresh) {
    const cached = await getCached(url)
    if (cached) {
      postToPopup(MSG.CACHE_HIT, cached)
      return
    }
  } else {
    await clearCached(url)
  }

  postToPopup(MSG.STATUS_UPDATE, { status: 'scraping', message: 'Reading product page…' })

  // Ask the content script to scrape
  try {
    await chrome.tabs.sendMessage(tabId, buildMsg(MSG.INIT_SCRAPER))
  } catch {
    postToPopup(MSG.ANALYSIS_ERROR, {
      message: 'Could not read this page. Make sure you are on a supported product page.',
    })
  }
}

/**
 * POSTs product data to the FastAPI backend and streams
 * the JSON result back to the popup via the port.
 */
async function callAnalysisApi(productData) {
  postToPopup(MSG.STATUS_UPDATE, { status: 'analyzing', message: 'AI is analysing the product…' })

    try {
    const response = await fetch(`${API_BASE}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Extension-Id': chrome.runtime.id,   // used by backend for rate limiting
      },
      body: JSON.stringify(productData),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.detail || `Server error ${response.status}`)
    }

    // Handle Server-Sent Events (SSE) streaming
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let finalResult = null

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() // keep incomplete last line

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const jsonStr = line.slice(6).trim()
        if (jsonStr === '[DONE]') break

        try {
          const chunk = JSON.parse(jsonStr)
          if (chunk.type === 'progress') {
            postToPopup(MSG.ANALYSIS_PROGRESS, chunk)
          } else if (chunk.type === 'result') {
            finalResult = chunk.data
          } else if (chunk.type === 'cache_hit') {
            // Backend cache hit — result arrives immediately
            finalResult = chunk.data
          }
        } catch { /* skip malformed chunks */ }
      }
    }

    if (finalResult) {
      await setCached(productData.url, finalResult)
      postToPopup(MSG.ANALYSIS_COMPLETE, finalResult)
    } else {
      throw new Error('No result received from server.')
    }
  } catch (err) {
    console.error('[ShopSense] API error:', err)
    postToPopup(MSG.ANALYSIS_ERROR, { message: err.message })
  }
}
