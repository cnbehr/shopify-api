'use client';

import { useState, useEffect } from 'react';

interface TrendingTool {
  tool_id: string;
  tool_name: string;
  tool_category: string;
  current_count: number;
  prior_count: number;
  growth_rate: number;
  net_wins: number;
}

const TABS = [
  { id: 'rising' as const, label: 'Rising' },
  { id: 'declining' as const, label: 'Declining' },
];

type TabId = typeof TABS[number]['id'];

export default function TrendingToolsWidget() {
  const [tab, setTab] = useState<TabId>('rising');
  const [rising, setRising] = useState<TrendingTool[]>([]);
  const [declining, setDeclining] = useState<TrendingTool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/trending-tools?days=7')
      .then(r => r.json())
      .then(data => {
        setRising(data.rising || []);
        setDeclining(data.declining || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const tools = tab === 'rising' ? rising : declining;
  const maxRate = Math.max(...tools.map(t => Math.abs(t.growth_rate)), 0.01);

  return (
    <div className="surface-panel p-6 fade-rise-delay">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Trending tools</h3>
        <span className="pill text-[10px]">7d</span>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-1 mb-4">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
              tab === t.id
                ? 'text-[var(--ink-strong)] bg-[rgba(255,255,255,0.08)]'
                : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-12 rounded-xl" />
          ))}
        </div>
      ) : tools.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-[var(--muted)]">
            No {tab} tools detected this period
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {tools.map(tool => {
            const pct = Math.abs(tool.growth_rate) / maxRate;
            const isPositive = tool.growth_rate > 0;
            const barColor = isPositive
              ? 'bg-gradient-to-r from-[var(--success)] to-[var(--cyan)]'
              : 'bg-gradient-to-r from-[var(--danger)] to-[var(--warning)]';

            return (
              <div key={tool.tool_id} className="surface-muted p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-semibold text-[var(--ink-strong)] truncate block">
                      {tool.tool_name}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                      {tool.tool_category}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                    <span className={`text-sm font-bold tabular-nums ${isPositive ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                      {isPositive ? '+' : ''}{(tool.growth_rate * 100).toFixed(1)}%
                    </span>
                    <span className="text-xs text-[var(--muted)] tabular-nums w-12 text-right">
                      {tool.net_wins > 0 ? '+' : ''}{tool.net_wins} net
                    </span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                  <div
                    className={`h-full rounded-full ${barColor} transition-all duration-500`}
                    style={{ width: `${Math.max(pct * 100, 4)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
