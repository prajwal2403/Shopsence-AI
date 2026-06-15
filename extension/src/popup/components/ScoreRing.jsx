import { useEffect, useRef, useState } from 'react'

// Returns HSL color string based on score 0-100
function scoreToHSL(score) {
  if (score >= 80) return '#10B981' // emerald
  if (score >= 60) return '#F59E0B' // amber
  if (score >= 40) return '#F97316' // orange
  return '#EF4444'                  // red
}

function scoreLabel(score) {
  if (score >= 80) return 'Excellent'
  if (score >= 60) return 'Good'
  if (score >= 40) return 'Fair'
  return 'Poor'
}

const RADIUS = 54
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function ScoreRing({ score = 0, productName }) {
  const [displayScore, setDisplayScore] = useState(0)
  const [animated, setAnimated] = useState(false)
  const rafRef = useRef(null)

  useEffect(() => {
    // Tick the score counter up from 0 → score over ~900ms
    const duration = 900
    const start = performance.now()

    const tick = (now) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayScore(Math.round(eased * score))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setAnimated(true)
      }
    }

    // Small delay so the card renders first
    const timeout = setTimeout(() => {
      rafRef.current = requestAnimationFrame(tick)
    }, 120)

    return () => {
      clearTimeout(timeout)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [score])

  const color = scoreToHSL(score)
  const label = scoreLabel(score)
  const fillRatio = score / 100
  const dashOffset = CIRCUMFERENCE * (1 - fillRatio)

  return (
    <div className="glass-card p-6 flex flex-col items-center gap-3 animate-fade-in">
      {/* Product name truncated */}
      {productName && (
        <p className="text-xs text-text-muted text-center line-clamp-2 leading-snug px-2">
          {productName}
        </p>
      )}

      {/* SVG Ring */}
      <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
        <svg width="140" height="140" viewBox="0 0 140 140" className="absolute inset-0">
          {/* Glow filter */}
          <defs>
            <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Track */}
          <circle
            cx="70" cy="70" r={RADIUS}
            fill="none"
            stroke="#1E2D4A"
            strokeWidth="10"
          />

          {/* Fill arc */}
          <circle
            cx="70" cy="70" r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={animated ? dashOffset : CIRCUMFERENCE}
            style={{
              transition: 'stroke-dashoffset 1.1s cubic-bezier(0.34,1.2,0.64,1), stroke 0.5s ease',
              transform: 'rotate(-90deg)',
              transformOrigin: '70px 70px',
              filter: 'url(#glow)',
            }}
          />
        </svg>

        {/* Centre text */}
        <div className="flex flex-col items-center select-none">
          <span
            className="text-4xl font-extrabold leading-none"
            style={{ color }}
          >
            {displayScore}
          </span>
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-widest mt-0.5">
            / 100
          </span>
        </div>
      </div>

      {/* Label badge */}
      <span
        className="text-sm font-semibold px-4 py-1 rounded-full"
        style={{
          background: `${color}20`,
          border: `1px solid ${color}50`,
          color,
        }}
      >
        {label}
      </span>
    </div>
  )
}
