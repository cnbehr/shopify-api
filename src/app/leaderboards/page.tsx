'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { SkeletonTable } from '@/components/Skeleton';

interface LeaderboardStore {
  domain: string;
  page_title: string;
  primary_category: string;
  composite_rank_score: number;
  pr_rank_position: number;
  significance_score: number;
  percentile_rank?: string | null;
  tools?: any[];
}

const LIMIT_OPTIONS = [50, 100, 1000] as const;

const TABS = [
  { id: 'authority', label: 'Top Authority', icon: '⚡' },
  { id: 'category', label: 'By Category', icon: '📂' },
  { id: 'tools', label: 'Most Tools', icon: '🧩' },
] as const;

type TabId = typeof TABS[number]['id'];

function getRankBadge(score: number) {
  if (score > 30) return 'badge-elite';
  if (score > 20) return 'badge-high';
  if (score > 10) return 'badge-good';
  if (score > 5) return 'badge-mid';
  return 'badge-low';
}

function RankNumber({ rank }: { rank: number }) {
  if (rank <= 3) {
    const colors = [
      'from-amber-400 to-yellow-600',
      'from-gray-300 to-gray-500',
      'from-amber-600 to-orange-800',
    ];
    return (
      <span
        className={`inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br ${colors[rank - 1]} text-xs font-bold text-white shadow-lg`}
      >
        {rank}
      </span>
    );
  }
  return <span className="text-sm text-[var(--muted)] font-mono">#{rank}</span>;
}

export default function LeaderboardsPage() {
  const [tab, setTab] = useState<TabId>('authority');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [stores, setStores] = useState<LeaderboardStore[]>([]);
  const [limit, setLimit] = useState<number>(LIMIT_OPTIONS[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ tab, limit: String(limit) });
    if (category) params.set('category', category);

    fetch(`/api/leaderboards?${params}`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to load');
        return r.json();
      })
      .then(data => {
        setStores(data.stores || []);
        if (data.categories) setCategories(data.categories);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load leaderboard data.');
        setLoading(false);
      });
  }, [tab, category, limit]);

  return (
    <AppShell>
      <div className="fade-rise">
        <span className="pill-cyan pill">Rankings</span>
        <h2 className="mt-3 text-3xl font-bold">Leaderboards</h2>
        <p className="mt-2 text-[var(--muted)]">
          Top Shopify stores ranked by composite score (with PR included), category, and tech sophistication.
        </p>

        {/* Tabs */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-1">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setCategory(''); }}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  tab === t.id
                    ? 'text-[var(--ink-strong)] bg-[rgba(255,255,255,0.08)]'
                    : 'text-[var(--muted)] hover:text-[var(--ink)]'
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          <select
            value={limit}
            onChange={e => setLimit(Number(e.target.value))}
            className="select max-w-[180px]"
          >
            {LIMIT_OPTIONS.map(value => (
              <option key={value} value={value}>Top {value}</option>
            ))}
          </select>

          {/* Category filter */}
          {categories.length > 0 && (
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="select max-w-[200px]"
            >
              <option value="">All categories</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
        </div>

        {error && (
          <div className="mt-4 surface-panel p-5 text-center">
            <p className="text-sm text-[var(--danger)]">{error}</p>
          </div>
        )}

        {/* Table */}
        <div className="mt-6 surface-panel p-5">
          {loading ? (
            <SkeletonTable rows={10} />
          ) : stores.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="text-left w-16">Rank</th>
                    <th className="text-left">Store</th>
                    <th className="text-left">Category</th>
                    <th className="text-right">{tab === 'tools' ? 'Tools' : 'Composite Rank'}</th>
                    <th className="text-right">Authority</th>
                  </tr>
                </thead>
                <tbody>
                  {stores.map((store, idx) => {
                    const toolCount = Array.isArray(store.tools) ? store.tools.length : 0;
                    return (
                      <tr key={store.domain} className="data-row">
                        <td>
                          <RankNumber rank={idx + 1} />
                        </td>
                        <td>
                          <Link
                            href={`/stores/${store.domain}`}
                            className="font-semibold text-[var(--accent-strong)] hover:underline"
                          >
                            {store.domain}
                          </Link>
                          <div className="text-xs text-[var(--muted)] truncate max-w-xs">
                            {store.page_title}
                          </div>
                        </td>
                        <td>
                          <span className="rounded-full bg-[var(--panel-muted)] border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--muted)]">
                            {store.primary_category}
                          </span>
                        </td>
                        <td className="text-right font-mono text-sm">
                          {tab === 'tools'
                            ? toolCount
                            : Number(store.composite_rank_score ?? 0).toFixed(3)}
                        </td>
                        <td className="text-right">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getRankBadge(store.significance_score)}`}>
                            {(store.significance_score ?? 0).toFixed(1)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-[var(--muted)]">
                {category ? `No stores found in "${category}"` : 'No leaderboard data available yet'}
              </p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
