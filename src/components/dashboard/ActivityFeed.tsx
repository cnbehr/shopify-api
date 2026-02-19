'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ActivityFeedItem {
  change_id: string;
  domain: string;
  change_date: string;
  change_type: string;
  change_category: string;
  change_description: string;
  old_value: string | null;
  new_value: string | null;
  severity: string;
}

function severityBadge(severity: string): string {
  switch (severity) {
    case 'critical': return 'bg-red-500/15 text-red-400 border-red-500/30';
    case 'high': return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
    case 'medium': return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';
    default: return 'bg-[rgba(255,255,255,0.06)] text-[var(--muted)] border-[var(--border)]';
  }
}

function groupByDate(items: ActivityFeedItem[]): Record<string, ActivityFeedItem[]> {
  const groups: Record<string, ActivityFeedItem[]> = {};
  for (const item of items) {
    const dateStr = typeof item.change_date === 'object'
      ? (item.change_date as any).value
      : String(item.change_date);
    if (!groups[dateStr]) groups[dateStr] = [];
    groups[dateStr].push(item);
  }
  return groups;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ActivityFeed() {
  const [items, setItems] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/activity-feed?limit=20')
      .then(r => r.json())
      .then(data => {
        setItems(data.items || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const grouped = groupByDate(items);
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="surface-panel p-6 fade-rise">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Activity feed</h3>
        <span className="pill-success pill text-[10px]">Live</span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-16 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-[var(--muted)]">No recent activity detected</p>
        </div>
      ) : (
        <div className="space-y-5 max-h-[600px] overflow-y-auto pr-1">
          {dates.map(date => (
            <div key={date}>
              <div className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-2 sticky top-0 bg-[var(--panel-solid)] py-1 z-10">
                {formatDate(date)}
              </div>
              <div className="space-y-2">
                {grouped[date].map(item => (
                  <div
                    key={item.change_id}
                    className="surface-muted p-3 flex items-start gap-3"
                  >
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold flex-shrink-0 mt-0.5 ${severityBadge(item.severity)}`}>
                      {item.severity}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Link
                          href={`/stores/${encodeURIComponent(item.domain)}`}
                          className="text-sm font-semibold text-[var(--accent-strong)] hover:underline truncate"
                        >
                          {item.domain}
                        </Link>
                      </div>
                      <div className="text-sm text-[var(--ink)]">
                        {item.change_description || item.change_type.replace(/_/g, ' ')}
                      </div>
                      {(item.old_value || item.new_value) && (
                        <div className="mt-1 text-xs text-[var(--muted)] flex items-center gap-2">
                          {item.old_value && <span className="line-through">{item.old_value}</span>}
                          {item.old_value && item.new_value && <span>&rarr;</span>}
                          {item.new_value && <span className="text-[var(--ink)]">{item.new_value}</span>}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-[var(--muted)] flex-shrink-0">
                      {item.change_category}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
