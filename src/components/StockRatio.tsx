interface StockRatioProps {
  inStock: number;
  outOfStock: number;
}

export function StockRatio({ inStock, outOfStock }: StockRatioProps) {
  const total = inStock + outOfStock;

  if (total === 0) return null;

  const inPct = Math.round((inStock / total) * 100);
  const outPct = 100 - inPct;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">
          Stock status
        </div>
        <div className="text-xs text-[var(--muted)] tabular-nums">
          {total.toLocaleString()} total products
        </div>
      </div>

      {/* Stacked bar */}
      <div className="relative h-6 rounded-full overflow-hidden flex border border-[var(--border)]">
        {inStock > 0 && (
          <div
            className="h-full flex items-center justify-center transition-all"
            style={{
              width: `${inPct}%`,
              background: 'var(--success)',
              minWidth: inPct > 0 ? '2px' : '0',
            }}
          >
            {inPct >= 20 && (
              <span className="text-[10px] font-semibold text-white/90 tabular-nums">
                {inPct}%
              </span>
            )}
          </div>
        )}
        {outOfStock > 0 && (
          <div
            className="h-full flex items-center justify-center transition-all"
            style={{
              width: `${outPct}%`,
              background: 'var(--danger)',
              minWidth: outPct > 0 ? '2px' : '0',
            }}
          >
            {outPct >= 20 && (
              <span className="text-[10px] font-semibold text-white/90 tabular-nums">
                {outPct}%
              </span>
            )}
          </div>
        )}
      </div>

      {/* Labels below when sections are too narrow */}
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-[var(--success)]" />
          <span className="text-[var(--success)]">{inStock.toLocaleString()}</span>
          <span className="text-[var(--muted)]">in stock</span>
          {inPct < 20 && (
            <span className="text-[var(--muted)] tabular-nums">({inPct}%)</span>
          )}
        </span>
        <span className="flex items-center gap-1.5">
          {outPct < 20 && (
            <span className="text-[var(--muted)] tabular-nums">({outPct}%)</span>
          )}
          <span className="text-[var(--muted)]">out of stock</span>
          <span className="text-[var(--danger)]">{outOfStock.toLocaleString()}</span>
          <span className="inline-block w-2 h-2 rounded-full bg-[var(--danger)]" />
        </span>
      </div>
    </div>
  );
}
