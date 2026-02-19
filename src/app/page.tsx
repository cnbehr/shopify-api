'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import TrendingToolsWidget from '@/components/dashboard/TrendingToolsWidget';
import CategorySpotlightGrid from '@/components/dashboard/CategorySpotlightGrid';
import WatchlistSummary from '@/components/dashboard/WatchlistSummary';

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M+`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K+`;
  return `${n}+`;
}

export default function Home() {
  const [storeCount, setStoreCount] = useState<string | null>(null);
  const [toolCount, setToolCount] = useState<string | null>(null);
  const [statsError, setStatsError] = useState(false);

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => {
        if (!r.ok) throw new Error('Stats fetch failed');
        return r.json();
      })
      .then((data) => {
        if (data.store_count) setStoreCount(formatCount(data.store_count));
        if (data.tool_count) setToolCount(formatCount(data.tool_count));
      })
      .catch(() => setStatsError(true));
  }, []);

  return (
    <AppShell>
      {/* Compact hero */}
      <section className="fade-rise">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
          <div className="space-y-3">
            <span className="pill">Intelligence platform</span>
            <h1 className="text-3xl font-bold leading-tight md:text-4xl">
              <span className="gradient-text">Competitive visibility</span>
              <br />
              for the fastest-growing Shopify brands.
            </h1>
            <p className="text-base text-[var(--muted)] max-w-lg leading-relaxed">
              Track store strategies, discover the tools powering top performers, and surface market shifts in real time.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 flex-shrink-0">
            <Link href="/tools" className="btn-primary">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 2L14 8L6 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Explore tools
            </Link>
            <Link href="/stores" className="btn-secondary">Search stores</Link>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid gap-3 sm:grid-cols-3 mb-8">
          <div className="surface-card stat-card p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Stores indexed</div>
            <div className="mt-2 text-2xl font-bold text-[var(--ink-strong)]">
              {statsError ? (
                <span className="text-sm text-[var(--muted)]">Unavailable</span>
              ) : storeCount ?? (
                <span className="skeleton inline-block h-7 w-20" />
              )}
            </div>
          </div>
          <div className="surface-card stat-card p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Tools tracked</div>
            <div className="mt-2 text-2xl font-bold text-[var(--ink-strong)]">
              {statsError ? (
                <span className="text-sm text-[var(--muted)]">Unavailable</span>
              ) : toolCount ?? (
                <span className="skeleton inline-block h-7 w-16" />
              )}
            </div>
          </div>
          <div className="surface-card stat-card p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Signal updates</div>
            <div className="mt-2 text-2xl font-bold text-[var(--ink-strong)]">Daily</div>
          </div>
        </div>
      </section>

      {/* Dashboard grid: Activity feed (left) + Trending tools + Watchlist (right) */}
      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr] mb-8">
        <div>
          <ActivityFeed />
        </div>
        <div className="space-y-4">
          <TrendingToolsWidget />
          <WatchlistSummary />
        </div>
      </section>

      {/* Category spotlight — full width */}
      <section className="mb-8">
        <CategorySpotlightGrid />
      </section>
    </AppShell>
  );
}
