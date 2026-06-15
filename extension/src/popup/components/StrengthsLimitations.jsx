import { useEffect, useRef } from 'react'

function Pill({ text, type, delay }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const timer = setTimeout(() => {
      el.style.opacity = '1'
      el.style.transform = 'translateY(0)'
    }, delay)
    return () => clearTimeout(timer)
  }, [delay])

  return (
    <span
      ref={ref}
      className={type === 'strength' ? 'pill-strength' : 'pill-limitation'}
      style={{
        opacity: 0,
        transform: 'translateY(6px)',
        transition: 'opacity 0.35s ease, transform 0.35s ease',
        display: 'inline-block',
      }}
    >
      {type === 'strength' ? '✓ ' : '✗ '}{text}
    </span>
  )
}

export default function StrengthsLimitations({ strengths = [], limitations = [] }) {
  return (
    <div className="grid grid-cols-2 gap-3 animate-slide-up">
      {/* Strengths */}
      <div className="glass-card p-4 space-y-2">
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-1">
          <span style={{ color: '#10B981' }}>●</span> Strengths
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {strengths.map((s, i) => (
            <Pill key={i} text={s} type="strength" delay={i * 70 + 150} />
          ))}
          {strengths.length === 0 && (
            <span className="text-xs text-text-muted">None found</span>
          )}
        </div>
      </div>

      {/* Limitations */}
      <div className="glass-card p-4 space-y-2">
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-1">
          <span style={{ color: '#EF4444' }}>●</span> Limitations
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {limitations.map((l, i) => (
            <Pill key={i} text={l} type="limitation" delay={i * 70 + 300} />
          ))}
          {limitations.length === 0 && (
            <span className="text-xs text-text-muted">None found</span>
          )}
        </div>
      </div>
    </div>
  )
}
