import { useEffect, useRef } from 'react'

// Max values per factor (must match backend schema)
const FACTOR_META = {
  priceValue:           { label: 'Price / Value',       max: 25 },
  ratingsQuality:       { label: 'Ratings Quality',     max: 20 },
  reviewAuthenticity:   { label: 'Review Authenticity', max: 20 },
  brandReputation:      { label: 'Brand Reputation',    max: 15 },
  specCompleteness:     { label: 'Spec Completeness',   max: 10 },
  deliveryAvailability: { label: 'Delivery',            max: 10 },
}

function barColor(pct) {
  if (pct >= 0.8) return '#10B981'
  if (pct >= 0.6) return '#F59E0B'
  if (pct >= 0.4) return '#F97316'
  return '#EF4444'
}

function AnimatedBar({ pct, color, delay }) {
  const barRef = useRef(null)

  useEffect(() => {
    const el = barRef.current
    if (!el) return
    const timer = setTimeout(() => {
      el.style.width = `${pct * 100}%`
    }, delay)
    return () => clearTimeout(timer)
  }, [pct, delay])

  return (
    <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: '#1E2D4A' }}>
      <div
        ref={barRef}
        className="h-full rounded-full"
        style={{
          width: '0%',
          background: color,
          transition: 'width 0.8s cubic-bezier(0.34,1.1,0.64,1)',
          boxShadow: `0 0 8px ${color}60`,
        }}
      />
    </div>
  )
}

export default function FactorBreakdown({ breakdown }) {
  if (!breakdown) return null

  return (
    <div className="glass-card p-4 space-y-3 animate-slide-up">
      <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
        Score Breakdown
      </h3>

      {Object.entries(FACTOR_META).map(([key, meta], i) => {
        const raw = breakdown[key] ?? 0
        const pct = Math.min(raw / meta.max, 1)
        const color = barColor(pct)

        return (
          <div key={key} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-secondary">{meta.label}</span>
              <span className="text-xs font-semibold tabular-nums" style={{ color }}>
                {raw}
                <span className="text-text-muted font-normal">/{meta.max}</span>
              </span>
            </div>
            <AnimatedBar pct={pct} color={color} delay={i * 80 + 200} />
          </div>
        )
      })}
    </div>
  )
}
