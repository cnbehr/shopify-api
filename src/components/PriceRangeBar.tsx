interface PriceRangeBarProps {
  min: number;
  avg: number;
  max: number;
  currency?: string;
}

export function PriceRangeBar({ min, avg, max, currency = '$' }: PriceRangeBarProps) {
  if (max <= 0) return null;

  const minPct = (min / max) * 100;
  const avgPct = (avg / max) * 100;

  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)] mb-3">
        Price range
      </div>

      {/* Track */}
      <div className="relative h-2 rounded-full bg-[var(--panel-muted)] border border-[var(--border)] overflow-visible">
        {/* Filled gradient bar from 0 to max (full width) */}
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: '100%',
            background: 'linear-gradient(90deg, var(--accent), var(--purple))',
            opacity: 0.5,
          }}
        />

        {/* Min marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-[var(--accent)] bg-[var(--bg)]"
          style={{ left: `${minPct}%`, transform: `translateX(-50%) translateY(-50%)` }}
        />

        {/* Avg marker (larger, brighter) */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-[var(--accent-strong)] bg-[var(--accent)]"
          style={{
            left: `${avgPct}%`,
            transform: 'translateX(-50%) translateY(-50%)',
            boxShadow: '0 0 8px var(--accent-glow)',
          }}
        />

        {/* Max marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-[var(--purple)] bg-[var(--bg)]"
          style={{ left: '100%', transform: 'translateX(-50%) translateY(-50%)' }}
        />
      </div>

      {/* Labels */}
      <div className="relative mt-3 h-5">
        <span
          className="absolute text-xs font-medium text-[var(--accent-strong)] tabular-nums"
          style={{ left: `${minPct}%`, transform: 'translateX(-50%)' }}
        >
          {currency}{min.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </span>
        <span
          className="absolute text-xs font-semibold text-[var(--ink-strong)] tabular-nums"
          style={{ left: `${avgPct}%`, transform: 'translateX(-50%)' }}
        >
          {currency}{avg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </span>
        <span
          className="absolute text-xs font-medium text-[var(--purple)] tabular-nums"
          style={{ left: '100%', transform: 'translateX(-50%)' }}
        >
          {currency}{max.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </span>
      </div>

      {/* Legend */}
      <div className="mt-1 flex items-center gap-4 text-[10px] text-[var(--muted)]">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full border border-[var(--accent)] bg-[var(--bg)]" />
          Min
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />
          Avg
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full border border-[var(--purple)] bg-[var(--bg)]" />
          Max
        </span>
      </div>
    </div>
  );
}
