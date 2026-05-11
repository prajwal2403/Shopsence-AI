export default function LoadingSkeleton({ statusMessage }) {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Status message */}
      <div className="flex items-center gap-3 px-1 pt-2 pb-1">
        <div className="spinner w-4 h-4 shrink-0" />
        <p className="text-sm text-text-secondary">{statusMessage || 'Analysing product…'}</p>
      </div>

      {/* Score ring placeholder */}
      <div className="glass-card p-6 flex flex-col items-center gap-3">
        <div className="skeleton w-32 h-32 rounded-full" />
        <div className="skeleton w-24 h-4 rounded" />
        <div className="skeleton w-16 h-3 rounded" />
      </div>

      {/* Factor bars */}
      <div className="glass-card p-4 space-y-3">
        <div className="skeleton w-28 h-3 rounded" />
        {[100, 85, 70, 90, 60, 80].map((w, i) => (
          <div key={i} className="space-y-1.5">
            <div className="flex justify-between">
              <div className="skeleton h-2.5 rounded" style={{ width: `${40 + (i * 10) % 40}%` }} />
              <div className="skeleton h-2.5 w-8 rounded" />
            </div>
            <div className="skeleton h-1.5 rounded-full w-full" />
          </div>
        ))}
      </div>

      {/* Strengths & limitations */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card p-4 space-y-2">
          <div className="skeleton w-20 h-3 rounded" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-6 rounded-full" style={{ width: `${60 + i * 10}%` }} />
          ))}
        </div>
        <div className="glass-card p-4 space-y-2">
          <div className="skeleton w-20 h-3 rounded" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-6 rounded-full" style={{ width: `${55 + i * 12}%` }} />
          ))}
        </div>
      </div>

      {/* Review cards */}
      <div className="glass-card p-4 space-y-3">
        <div className="skeleton w-24 h-3 rounded" />
        {[1, 2].map((i) => (
          <div key={i} className="space-y-2 pb-3 border-b border-surface-border last:border-0">
            <div className="flex gap-2">
              <div className="skeleton w-8 h-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="skeleton h-2.5 w-24 rounded" />
                <div className="skeleton h-2 w-16 rounded" />
              </div>
            </div>
            <div className="skeleton h-2.5 w-full rounded" />
            <div className="skeleton h-2.5 w-4/5 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
