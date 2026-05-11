import { useEffect, useReducer, useRef } from 'react'
import { MSG, connectToBackground, sendToBackground } from '../utils/messaging.js'
import Header from './components/Header'
import LoadingSkeleton from './components/LoadingSkeleton'
import EmptyState from './components/EmptyState'
import ErrorState from './components/ErrorState'

// ─── App State Machine ────────────────────────────────────────────────────────

const STATES = {
  IDLE: 'IDLE',
  SCRAPING: 'SCRAPING',
  ANALYZING: 'ANALYZING',
  SUCCESS: 'SUCCESS',
  NOT_PRODUCT: 'NOT_PRODUCT',
  ERROR: 'ERROR',
}

function reducer(state, action) {
  switch (action.type) {
    case 'START':
      return { ...state, status: STATES.SCRAPING, statusMessage: 'Reading product page…', error: null }
    case 'PROGRESS':
      return { ...state, status: STATES.ANALYZING, statusMessage: action.message }
    case 'SUCCESS':
      return { ...state, status: STATES.SUCCESS, result: action.result, cachedAt: action.cachedAt }
    case 'CACHE_HIT':
      return { ...state, status: STATES.SUCCESS, result: action.result, cachedAt: action.cachedAt, fromCache: true }
    case 'NOT_PRODUCT':
      return { ...state, status: STATES.NOT_PRODUCT }
    case 'ERROR':
      return { ...state, status: STATES.ERROR, error: action.message }
    default:
      return state
  }
}

const initialState = {
  status: STATES.IDLE,
  statusMessage: 'Initialising…',
  result: null,
  error: null,
  cachedAt: null,
  fromCache: false,
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const portRef = useRef(null)
  const tabRef = useRef(null)

  useEffect(() => {
    // Open a long-lived port to the background for streaming updates
    const port = connectToBackground('popup')
    portRef.current = port

    port.onMessage.addListener((msg) => {
      switch (msg.type) {
        case MSG.STATUS_UPDATE:
          dispatch({ type: 'PROGRESS', message: msg.payload.message })
          break
        case MSG.ANALYSIS_PROGRESS:
          dispatch({ type: 'PROGRESS', message: msg.payload.message || 'Analysing…' })
          break
        case MSG.ANALYSIS_COMPLETE:
          dispatch({ type: 'SUCCESS', result: msg.payload, cachedAt: null })
          break
        case MSG.CACHE_HIT:
          dispatch({ type: 'CACHE_HIT', result: msg.payload, cachedAt: msg.payload._cacheAge })
          break
        case MSG.NOT_PRODUCT_PAGE:
          dispatch({ type: 'NOT_PRODUCT' })
          break
        case MSG.ANALYSIS_ERROR:
          dispatch({ type: 'ERROR', message: msg.payload.message })
          break
      }
    })

    // Ask background to analyse the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0]
      if (!tab) {
        dispatch({ type: 'ERROR', message: 'No active tab found.' })
        return
      }
      tabRef.current = tab
      dispatch({ type: 'START' })
      sendToBackground(MSG.REQUEST_ANALYSIS, { tabId: tab.id, url: tab.url })
    })

    return () => { port.disconnect() }
  }, [])

  const handleRefresh = () => {
    const tab = tabRef.current
    if (!tab) return
    dispatch({ type: 'START' })
    sendToBackground(MSG.REQUEST_ANALYSIS, {
      tabId: tab.id,
      url: tab.url,
      forceRefresh: true,
    })
  }

  const { status, statusMessage, result, error, fromCache, cachedAt } = state

  return (
    <div className="flex flex-col min-h-screen bg-surface text-text-primary">
      <Header
        status={status}
        platform={result?.platform || null}
        fromCache={fromCache}
        cacheAge={cachedAt}
        onRefresh={handleRefresh}
      />

      <main className="flex-1 p-4">
        {(status === STATES.IDLE || status === STATES.SCRAPING || status === STATES.ANALYZING) && (
          <LoadingSkeleton statusMessage={statusMessage} />
        )}

        {status === STATES.NOT_PRODUCT && <EmptyState />}

        {status === STATES.ERROR && (
          <ErrorState message={error} onRetry={handleRefresh} />
        )}

        {status === STATES.SUCCESS && result && (
          <div className="animate-fade-in space-y-4">
            {/* Phase 2-4 components will be added here */}
            <div className="glass-card p-6 text-center">
              <p className="text-text-secondary text-sm">
                ✅ Product detected on <span className="text-accent font-semibold capitalize">{result.platform}</span>
              </p>
              <p className="text-text-muted text-xs mt-2 break-all">{result.url}</p>
              <p className="text-text-muted text-xs mt-4">
                Full scoring UI coming in Phase 4.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
