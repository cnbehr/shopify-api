export function SkeletonLine({ className = '' }: { className?: string }) {
  return <div className={`skeleton h-4 ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="surface-card p-5 space-y-4">
      <div className="skeleton h-3 w-24" />
      <div className="skeleton h-7 w-32" />
      <div className="skeleton h-3 w-48" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          <div className="skeleton h-4 w-40" />
          <div className="skeleton h-4 w-24" />
          <div className="skeleton h-4 w-16 ml-auto" />
          <div className="skeleton h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonStoreCard() {
  return (
    <div className="surface-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="skeleton h-5 w-36" />
        <div className="skeleton h-6 w-16 rounded-full" />
      </div>
      <div className="skeleton h-3 w-full" />
      <div className="flex gap-2 mt-2">
        <div className="skeleton h-6 w-20 rounded-full" />
        <div className="skeleton h-6 w-16 rounded-full" />
      </div>
    </div>
  );
}

export function DataCollecting({ message = 'Data collecting...', subtitle }: { message?: string; subtitle?: string }) {
  return (
    <div className="data-collecting">
      <div className="dot-pulse">
        <span />
        <span />
        <span />
      </div>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      {subtitle !== undefined ? (
        <p className="text-xs text-[var(--muted)]">{subtitle}</p>
      ) : (
        <p className="text-xs text-[var(--muted)]">Enrichment is populating this view</p>
      )}
    </div>
  );
}

export function EmptyState({ message = 'No data available', icon }: { message?: string; icon?: React.ReactNode }) {
  return (
    <div className="text-center py-8">
      {icon && <div className="text-[var(--muted)] opacity-30 mb-3">{icon}</div>}
      <p className="text-sm text-[var(--muted)]">{message}</p>
    </div>
  );
}

export function ErrorState({ message = 'Something went wrong', onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="text-center py-8">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-red-400 mb-3">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
      </div>
      <p className="text-sm text-[var(--danger)]">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-3 btn-ghost text-sm text-[var(--accent-strong)]">
          Try again
        </button>
      )}
    </div>
  );
}
