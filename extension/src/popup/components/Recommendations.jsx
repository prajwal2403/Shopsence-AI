import { useRef, useState } from 'react'

const PLATFORM_SEARCH_URLS = {
  amazon:   (q) => `https://www.amazon.in/s?k=${encodeURIComponent(q)}`,
  flipkart: (q) => `https://www.flipkart.com/search?q=${encodeURIComponent(q)}`,
  myntra:   (q) => `https://www.myntra.com/${encodeURIComponent(q)}`,
  default:  (q) => `https://www.google.com/search?q=${encodeURIComponent(q + ' buy online')}`,
}

function buildUrl(platform, query) {
  const fn = PLATFORM_SEARCH_URLS[platform] || PLATFORM_SEARCH_URLS.default
  return fn(query)
}

function RecommendationCard({ query, platform, recommendation, index }) {
  return (
    <div
      className="shrink-0 glass-card p-4 space-y-3"
      style={{
        width: '260px',
        scrollSnapAlign: 'start',
        animation: `slideUp 0.4s ease ${index * 0.1}s both`,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg,#6366F1,#A855F7)' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1l1.5 3 3.3.5-2.4 2.3.6 3.3L7 8.7l-3 1.4.6-3.3L2.2 4.5 5.5 4z" fill="white"/>
          </svg>
        </div>
        <div>
          <p className="text-[10px] text-text-muted uppercase tracking-wider">Consider instead</p>
          <p className="text-xs font-semibold text-accent capitalize">{platform || 'Search'}</p>
        </div>
      </div>

      {/* Recommendation text */}
      {recommendation && (
        <p className="text-xs text-text-secondary leading-relaxed">
          {recommendation}
        </p>
      )}

      {/* Search query pill */}
      <div className="text-[11px] text-text-muted bg-surface-elevated px-2 py-1 rounded-lg truncate font-mono border border-surface-border">
        🔍 {query}
      </div>

      {/* CTA */}
      <a
        href={buildUrl(platform, query)}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-xs font-semibold text-white transition-all hover:brightness-110 active:scale-95"
        style={{ background: 'linear-gradient(135deg,#6366F1,#A855F7)' }}
      >
        Find Better Options
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2.5 6h7M6.5 3l3 3-3 3" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </a>
    </div>
  )
}

export default function Recommendations({ recommendation, alternativeSearchQuery, platform }) {
  const scrollRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  if (!alternativeSearchQuery && !recommendation) return null

  // Build a few platform search cards if available
  const query = alternativeSearchQuery || recommendation || ''
  const platforms = platform
    ? [platform, ...(platform === 'amazon' ? ['flipkart'] : ['amazon'])]
    : ['amazon', 'flipkart']

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 8)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8)
  }

  const scrollBy = (dir) => {
    scrollRef.current?.scrollBy({ left: dir * 270, behavior: 'smooth' })
  }

  return (
    <div className="glass-card p-4 animate-slide-up space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Recommendations
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => scrollBy(-1)}
            className="w-6 h-6 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-all disabled:opacity-30"
            aria-label="Scroll left"
          >
            ‹
          </button>
          <button
            onClick={() => scrollBy(1)}
            className="w-6 h-6 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-all"
            aria-label="Scroll right"
          >
            ›
          </button>
        </div>
      </div>

      {/* Horizontal scroll carousel */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-3 overflow-x-auto pb-1"
        style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none' }}
      >
        {platforms.map((p, i) => (
          <RecommendationCard
            key={p}
            index={i}
            query={query}
            platform={p}
            recommendation={i === 0 ? recommendation : undefined}
          />
        ))}
      </div>
    </div>
  )
}
