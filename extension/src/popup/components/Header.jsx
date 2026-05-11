import { formatCacheAge } from '../../utils/cache.js'

const PLATFORM_LABELS = {
  amazon: 'Amazon',
  flipkart: 'Flipkart',
  myntra: 'Myntra',
  meesho: 'Meesho',
  nykaa: 'Nykaa',
  snapdeal: 'Snapdeal',
}

const STATUS_DOTS = {
  IDLE: 'bg-text-muted',
  SCRAPING: 'bg-warning animate-pulse',
  ANALYZING: 'bg-accent animate-pulse',
  SUCCESS: 'bg-success',
  NOT_PRODUCT: 'bg-text-muted',
  ERROR: 'bg-danger',
}

export default function Header({ status, platform, fromCache, cacheAge, onRefresh }) {
  const dotClass = STATUS_DOTS[status] || STATUS_DOTS.IDLE

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3"
      style={{ background: 'rgba(7,11,20,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #1E2D4A' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #6366F1, #A855F7)' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 2h2l2 8h6l2-6H5" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="7" cy="13" r="1" fill="white"/>
            <circle cx="11" cy="13" r="1" fill="white"/>
            <path d="M10 5l1 1-1 1M12 5l-1 1 1 1" stroke="white" strokeWidth="0.8" strokeLinecap="round"/>
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold text-text-primary leading-none">ShopSense</p>
          <p className="text-[10px] text-accent leading-none font-medium">AI</p>
        </div>
      </div>

      {/* Centre: platform + cache badge */}
      <div className="flex items-center gap-2">
        {platform && (
          <span className={`platform-badge platform-${platform}`}>
            {PLATFORM_LABELS[platform] || platform}
          </span>
        )}
        {fromCache && cacheAge && (
          <span className="text-[10px] text-text-muted bg-surface-elevated px-2 py-0.5 rounded-full">
            {formatCacheAge(cacheAge)}
          </span>
        )}
      </div>

      {/* Right: status dot + refresh */}
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${dotClass}`} />
        <button
          onClick={onRefresh}
          title="Re-analyse"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-all"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M11 6.5A4.5 4.5 0 1 1 6.5 2a4.48 4.48 0 0 1 3.18 1.32L11 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            <path d="M11 2v3H8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </header>
  )
}
