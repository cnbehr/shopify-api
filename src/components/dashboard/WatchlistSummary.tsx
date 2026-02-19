'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface WatchlistAlert {
  domain: string;
  recent_changes_count: number;
  latest_change: string | null;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export default function WatchlistSummary() {
  const [alerts, setAlerts] = useState<WatchlistAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/watchlist')
      .then(r => r.json())
      .then(data => {
        setAlerts(data.alerts || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="surface-panel p-6 fade-rise-delay">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Watchlist</h3>
        <Link href="/alerts" className="btn-ghost text-xs">
          Manage
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-12 rounded-xl" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-6">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-strong)] mb-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <p className="text-sm text-[var(--muted)]">No stores watched yet</p>
          <Link href="/alerts" className="btn-secondary mt-3 text-xs inline-flex">
            Set up alerts
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map(alert => (
            <Link
              key={alert.domain}
              href={`/stores/${encodeURIComponent(alert.domain)}`}
              className="surface-muted p-3 flex items-center justify-between gap-3 group hover:border-[var(--accent)] transition-all"
              style={{ display: 'flex' }}
            >
              <div className="min-w-0 flex-1">
                <span className="text-sm font-semibold text-[var(--ink-strong)] group-hover:text-[var(--accent-strong)] transition-colors truncate block">
                  {alert.domain}
                </span>
                {alert.latest_change && (
                  <span className="text-[10px] text-[var(--muted)]">
                    Last change: {formatDate(alert.latest_change)}
                  </span>
                )}
              </div>
              <span className="inline-flex items-center rounded-full bg-[var(--accent-soft)] border border-[rgba(59,130,246,0.15)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent-strong)] flex-shrink-0">
                {alert.recent_changes_count} change{alert.recent_changes_count !== 1 ? 's' : ''}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
