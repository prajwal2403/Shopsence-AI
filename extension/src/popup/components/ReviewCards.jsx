import { useState } from 'react'

const TABS = [
  { key: 'positive', label: 'Positive', emoji: '👍', color: '#10B981' },
  { key: 'critical',  label: 'Critical', emoji: '👎', color: '#EF4444' },
  { key: 'balanced', label: 'Balanced', emoji: '⚖️', color: '#F59E0B' },
]

function StarRow({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path
            d="M5 1l1.1 2.3 2.5.35-1.8 1.75.42 2.47L5 6.6l-2.22 1.27.42-2.47L1.4 3.65l2.5-.35L5 1z"
            fill={n <= (rating || 0) ? '#F59E0B' : '#1E2D4A'}
          />
        </svg>
      ))}
    </div>
  )
}

function ReviewCard({ review }) {
  const [expanded, setExpanded] = useState(false)
  if (!review) return (
    <p className="text-xs text-text-muted py-4 text-center">No review available</p>
  )

  const body = review.body || review.text || ''
  const truncated = body.length > 160 && !expanded
  const displayBody = truncated ? body.slice(0, 160) + '…' : body

  return (
    <div className="space-y-2">
      {/* Author row */}
      <div className="flex items-start gap-2">
        {/* Avatar */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
          style={{ background: 'linear-gradient(135deg,#6366F1,#A855F7)', color: '#fff' }}
        >
          {(review.author || 'U')[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-text-primary truncate">
            {review.author || 'Anonymous'}
          </p>
          <div className="flex items-center gap-2">
            <StarRow rating={review.rating} />
            {review.verified && (
              <span className="text-[10px] text-success bg-success/10 px-1.5 py-0.5 rounded-full">
                ✓ Verified
              </span>
            )}
          </div>
        </div>
        {review.date && (
          <span className="text-[10px] text-text-muted shrink-0">{review.date}</span>
        )}
      </div>

      {/* Title */}
      {review.title && (
        <p className="text-xs font-semibold text-text-primary">{review.title}</p>
      )}

      {/* Body */}
      <p className="text-xs text-text-secondary leading-relaxed">
        {displayBody}
        {body.length > 160 && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="ml-1 text-accent font-medium hover:underline focus:outline-none"
          >
            {expanded ? 'Show less' : 'Read more'}
          </button>
        )}
      </p>
    </div>
  )
}

export default function ReviewCards({ topReviews }) {
  const [activeTab, setActiveTab] = useState('positive')

  if (!topReviews) return null

  const review = topReviews[activeTab]

  return (
    <div className="glass-card p-4 animate-slide-up">
      <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
        Top Reviews
      </h3>

      {/* Tab bar */}
      <div className="flex gap-1 mb-4 p-0.5 rounded-lg" style={{ background: '#0D1424' }}>
        {TABS.map(({ key, label, emoji, color }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-xs font-medium transition-all duration-200"
            style={
              activeTab === key
                ? {
                    background: `${color}18`,
                    color,
                    border: `1px solid ${color}40`,
                    boxShadow: `0 0 12px ${color}20`,
                  }
                : { color: '#475569' }
            }
          >
            <span>{emoji}</span>
            {label}
          </button>
        ))}
      </div>

      {/* Review body */}
      <div className="animate-fade-in" key={activeTab}>
        <ReviewCard review={review} />
      </div>
    </div>
  )
}
