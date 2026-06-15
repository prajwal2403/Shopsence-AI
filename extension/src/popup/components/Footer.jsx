import { formatCacheAge } from '../../utils/cache.js'

export default function Footer({ cachedAt, fromCache, onRefresh }) {
  return (
    <footer
      className="sticky bottom-0 z-10 flex items-center justify-between px-4 py-2.5"
      style={{
        background: 'rgba(7,11,20,0.97)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid #1E2D4A',
      }}
    >
      {/* Cache age */}
      <div className="flex items-center gap-1.5">
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none" className="text-text-muted">
          <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.1"/>
          <path d="M5.5 3v2.5l1.5 1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
        </svg>
        <span className="text-[11px] text-text-muted">
          {fromCache && cachedAt
            ? `Analysed ${formatCacheAge(cachedAt)}`
            : 'Just analysed'}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {/* Refresh button */}
        <button
          id="footer-refresh-btn"
          onClick={onRefresh}
          title="Re-analyse"
          className="flex items-center gap-1.5 text-[11px] text-text-muted hover:text-accent px-2 py-1 rounded-lg hover:bg-surface-elevated transition-all"
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M9.5 5.5A4 4 0 1 1 5.5 1.5a3.97 3.97 0 0 1 2.83 1.17L9.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            <path d="M9.5 1.5v2.5H7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Refresh
        </button>

        {/* Divider */}
        <span className="text-surface-border select-none">|</span>

        {/* Settings cog */}
        <button
          id="footer-settings-btn"
          title="Settings"
          className="w-7 h-7 flex items-center justify-center rounded-lg text-text-muted hover:text-accent hover:bg-surface-elevated transition-all"
          onClick={() => chrome?.runtime?.openOptionsPage?.()}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <circle cx="6.5" cy="6.5" r="2" stroke="currentColor" strokeWidth="1.2"/>
            <path
              d="M6.5 1.5v1M6.5 10.5v1M11.5 6.5h-1M2.5 6.5h-1M10.3 2.7l-.7.7M3.4 9.6l-.7.7M10.3 10.3l-.7-.7M3.4 3.4l-.7-.7"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </footer>
  )
}
