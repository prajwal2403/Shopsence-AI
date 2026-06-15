import { useEffect, useReducer, useRef } from 'react'
import { MSG, connectToBackground, sendToBackground } from '../utils/messaging.js'
import Header from './components/Header'
import LoadingSkeleton from './components/LoadingSkeleton'
import EmptyState from './components/EmptyState'
import ErrorState from './components/ErrorState'
import ScoreRing from './components/ScoreRing'
import FactorBreakdown from './components/FactorBreakdown'
import StrengthsLimitations from './components/StrengthsLimitations'
import ReviewCards from './components/ReviewCards'
import Recommendations from './components/Recommendations'
import Footer from './components/Footer'

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
  const isLoading = status === STATES.IDLE || status === STATES.SCRAPING || status === STATES.ANALYZING
  const isSuccess = status === STATES.SUCCESS && result

  return (
    <div className="flex flex-col min-h-screen bg-surface text-text-primary">
      {/* ── Header ── */}
      <Header
        status={status}
        platform={result?.platform || null}
        fromCache={fromCache}
        cacheAge={cachedAt}
        onRefresh={handleRefresh}
      />

      {/* ── Main scrollable content ── */}
      <main className="flex-1 p-4 pb-2 space-y-4">
        {/* Loading skeleton */}
        {isLoading && <LoadingSkeleton statusMessage={statusMessage} />}

        {/* Not a product page */}
        {status === STATES.NOT_PRODUCT && <EmptyState />}

        {/* Error state */}
        {status === STATES.ERROR && (
          <ErrorState message={error} onRetry={handleRefresh} />
        )}

        {/* ── Success: full analysis UI ── */}
        {isSuccess && (
          <div className="space-y-4">
            {/* 1. Score ring */}
            <ScoreRing
              score={result.score ?? 0}
              productName={result.productName}
            />

            {/* 2. Factor breakdown */}
            <FactorBreakdown breakdown={result.scoreBreakdown} />

            {/* 3. Strengths & Limitations */}
            <StrengthsLimitations
              strengths={result.strengths ?? []}
              limitations={result.limitations ?? []}
            />

            {/* 4. Review cards */}
            <ReviewCards topReviews={result.topReviews} />

            {/* 5. Recommendations carousel */}
            <Recommendations
              recommendation={result.recommendation}
              alternativeSearchQuery={result.alternativeSearchQuery}
              platform={result.platform}
            />
          </div>
        )}
      </main>

      {/* ── Footer (only when analysis is done) ── */}
      {isSuccess && (
        <Footer
          cachedAt={cachedAt}
          fromCache={fromCache}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  )
}
