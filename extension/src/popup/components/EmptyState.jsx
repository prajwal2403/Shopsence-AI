export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center animate-fade-in">
      {/* Icon */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.15))', border: '1px solid rgba(99,102,241,0.2)' }}>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <path d="M6 6h5l5 18h14l5-14H13" stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="17" cy="30" r="2.5" fill="#6366F1"/>
            <circle cx="26" cy="30" r="2.5" fill="#6366F1"/>
          </svg>
        </div>
        {/* Decorative glow */}
        <div className="absolute inset-0 rounded-2xl blur-xl opacity-20"
          style={{ background: 'linear-gradient(135deg, #6366F1, #A855F7)' }} />
      </div>

      <h2 className="text-base font-semibold text-text-primary mb-2">
        No Product Detected
      </h2>
      <p className="text-sm text-text-secondary leading-relaxed mb-6">
        Navigate to a product page on Amazon, Flipkart, or Myntra to get an instant AI-powered score.
      </p>

      {/* Supported sites */}
      <div className="w-full glass-card p-4">
        <p className="text-xs text-text-muted mb-3 font-medium uppercase tracking-wider">Supported Stores</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {['Amazon', 'Flipkart', 'Myntra', 'Meesho', 'Nykaa', 'Snapdeal'].map((site) => (
            <span key={site}
              className="text-xs px-3 py-1 rounded-full text-text-secondary"
              style={{ background: '#131D35', border: '1px solid #1E2D4A' }}>
              {site}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
