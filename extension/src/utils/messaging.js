/**
 * messaging.js — Type-safe message bus helpers for ShopSense AI
 *
 * All messages between content ↔ background ↔ popup go through
 * these typed constants and helpers so we never have magic strings.
 */

// ─── Message Types ────────────────────────────────────────────────────────────

export const MSG = {
  // Content → Background
  SCRAPE_RESULT: 'SCRAPE_RESULT',
  NOT_PRODUCT_PAGE: 'NOT_PRODUCT_PAGE',

  // Background → Content
  INIT_SCRAPER: 'INIT_SCRAPER',

  // Popup → Background
  REQUEST_ANALYSIS: 'REQUEST_ANALYSIS',
  CLEAR_CACHE: 'CLEAR_CACHE',

  // Background → Popup (via port)
  ANALYSIS_PROGRESS: 'ANALYSIS_PROGRESS',
  ANALYSIS_COMPLETE: 'ANALYSIS_COMPLETE',
  ANALYSIS_ERROR: 'ANALYSIS_ERROR',
  CACHE_HIT: 'CACHE_HIT',
  STATUS_UPDATE: 'STATUS_UPDATE',
}

// ─── Port Names ───────────────────────────────────────────────────────────────

export const PORTS = {
  POPUP: 'popup',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Send a one-off message to the background service worker.
 * Returns a Promise that resolves with the response.
 */
export function sendToBackground(type, payload = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type, payload }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
      } else {
        resolve(response)
      }
    })
  })
}

/**
 * Send a message to the active tab's content script.
 */
export function sendToContentScript(tabId, type, payload = {}) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { type, payload }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
      } else {
        resolve(response)
      }
    })
  })
}

/**
 * Open a long-lived port to the background for streaming updates.
 * Returns the port; caller should set port.onMessage.addListener.
 */
export function connectToBackground(name = PORTS.POPUP) {
  return chrome.runtime.connect({ name })
}

/**
 * Build a typed message object.
 */
export function buildMsg(type, payload = {}) {
  return { type, payload, timestamp: Date.now() }
}
