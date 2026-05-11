export default function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center animate-fade-in">
      {/* Icon */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
            <circle cx="17" cy="17" r="13" stroke="#EF4444" strokeWidth="2"/>
            <path d="M17 10v8" stroke="#EF4444" strokeWidth="2.2" strokeLinecap="round"/>
            <circle cx="17" cy="23" r="1.5" fill="#EF4444"/>
          </svg>
        </div>
      </div>

      <h2 className="text-base font-semibold text-text-primary mb-2">Analysis Failed</h2>
      <p className="text-sm text-text-secondary leading-relaxed mb-6">
        {message || 'Something went wrong. Please try again.'}
      </p>

      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
        style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M12 7A5 5 0 1 1 7 2a4.98 4.98 0 0 1 3.54 1.46L12 5" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
          <path d="M12 2v3H9" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Try Again
      </button>
    </div>
  )
}
