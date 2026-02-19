'use client';

import { useState, useEffect, useMemo } from 'react';
import AppShell from '@/components/AppShell';
import { SkeletonCard } from '@/components/Skeleton';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

type EnrichmentDailyRow = {
  snapshot_date: string;
  deep_count: number;
  basic_count: number;
  total_count: number;
  success_count: number;
  failed_count: number;
};

type EnrichmentFeatureCoverage = {
  total_deep: number;
  has_theme: number;
  shopify_plus: number;
  has_announcement: number;
  has_guarantee: number;
  has_entry_offer: number;
  has_positioning: number;
  has_landing_pages: number;
  has_bundles: number;
  has_subscriptions: number;
  has_page_builder: number;
};

type EnrichmentThroughputRow = {
  hour: string;
  deep: number;
  basic: number;
  total: number;
};

type EnrichmentStatus = {
  daily: EnrichmentDailyRow[];
  feature_coverage: EnrichmentFeatureCoverage;
  total_active: number;
  throughput: EnrichmentThroughputRow[];
  generated_at: string;
};

const REFRESH_MS = 30000;

function StatusDot({ color }: { color: string }) {
  return (
    <span className="relative flex h-2 w-2">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-50`} />
      <span className={`relative inline-flex rounded-full h-2 w-2 ${color}`} />
    </span>
  );
}

const FEATURES: Array<{ key: keyof EnrichmentFeatureCoverage; label: string }> = [
  { key: 'has_theme', label: 'Theme' },
  { key: 'shopify_plus', label: 'Shopify Plus' },
  { key: 'has_page_builder', label: 'Page Builder' },
  { key: 'has_announcement', label: 'Announcement Bar' },
  { key: 'has_guarantee', label: 'Guarantee' },
  { key: 'has_entry_offer', label: 'Entry Offer' },
  { key: 'has_positioning', label: 'Positioning' },
  { key: 'has_landing_pages', label: 'Landing Pages' },
  { key: 'has_bundles', label: 'Bundles' },
  { key: 'has_subscriptions', label: 'Subscriptions' },
];

export default function EnrichmentPage() {
  const [data, setData] = useState<EnrichmentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    let timer: NodeJS.Timeout;

    const load = async () => {
      try {
        setError('');
        const res = await fetch('/api/enrichment-status', { cache: 'no-store' });
        if (!res.ok) {
          throw new Error('Failed to load enrichment status');
        }
        const json = (await res.json()) as EnrichmentStatus;
        if (mounted) {
          setData(json);
          setLoading(false);
        }
      } catch {
        if (mounted) {
          setError('Unable to load enrichment status.');
          setLoading(false);
        }
      }
      if (mounted) {
        timer = setTimeout(load, REFRESH_MS);
      }
    };

    load();
    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const daily = useMemo(() => data?.daily || [], [data]);
  const throughput = useMemo(() => data?.throughput || [], [data]);
  const fc = data?.feature_coverage;
  const latest = daily[0];

  const coveragePct =
    latest && data && data.total_active > 0
      ? ((latest.total_count / data.total_active) * 100).toFixed(1)
      : '0.0';

  return (
    <AppShell>
      <section className="space-y-6 fade-rise">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="pill">Enrichment</span>
            </div>
            <h1 className="mt-3 text-3xl font-bold">Enrichment status</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Deep & basic enrichment progress. Auto-refreshes every 30s.
            </p>
          </div>
          <div className="surface-muted px-4 py-2.5 text-xs text-[var(--muted)] flex items-center gap-2">
            <StatusDot color="bg-emerald-400" />
            {data ? new Date(data.generated_at).toLocaleTimeString() : 'Connecting...'}
          </div>
        </div>

        {loading && (
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {error && (
          <div className="surface-card border-[var(--danger-soft)] p-5 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        {!loading && !error && data && latest && fc && (
          <>
            {/* Stat cards */}
            <div className="grid gap-3 md:grid-cols-3">
              <div className="surface-card stat-card p-4">
                <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Deep Enriched</div>
                <div className="mt-2 text-2xl font-bold text-[var(--purple)]">
                  {latest.deep_count.toLocaleString()}
                </div>
                <div className="mt-1 text-xs text-[var(--muted)]">/20,000 target</div>
              </div>
              <div className="surface-card stat-card p-4">
                <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Basic Enriched</div>
                <div className="mt-2 text-2xl font-bold text-[var(--accent)]">
                  {latest.basic_count.toLocaleString()}
                </div>
                <div className="mt-1 text-xs text-[var(--muted)]">/{latest.total_count.toLocaleString()} total</div>
              </div>
              <div className="surface-card stat-card p-4">
                <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Total Coverage</div>
                <div className="mt-2 text-2xl font-bold text-[var(--success)]">
                  {coveragePct}%
                </div>
                <div className="mt-1 text-xs text-[var(--muted)]">{latest.total_count.toLocaleString()} / {data.total_active.toLocaleString()} active</div>
              </div>
            </div>

            {/* Feature coverage */}
            <div className="surface-panel p-5">
              <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Deep enrichment feature coverage</div>
              <div className="mt-4 grid md:grid-cols-3 lg:grid-cols-4 gap-3">
                {FEATURES.map(({ key, label }) => {
                  const count = Number(fc[key] ?? 0);
                  const pct = fc.total_deep > 0 ? (count / fc.total_deep) * 100 : 0;
                  return (
                    <div key={key} className="surface-muted p-3">
                      <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">{label}</div>
                      <div className="mt-1 text-lg font-bold text-[var(--ink-strong)]">{count.toLocaleString()}</div>
                      <div className="mt-1.5 h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                        <div className="h-full rounded-full bg-[var(--purple)]" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="mt-1 text-[10px] text-[var(--muted)]">{pct.toFixed(1)}%</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Throughput chart */}
            <div className="surface-panel p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Throughput</div>
                  <div className="mt-1 text-base font-semibold">Throughput (last 24h)</div>
                </div>
                <span className="pill">last 24h</span>
              </div>
              <div className="mt-5 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={throughput}>
                    <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 10,
                        border: '1px solid var(--border)',
                        background: 'var(--panel-solid)',
                        color: 'var(--ink)',
                        boxShadow: 'var(--shadow-soft)',
                        fontSize: 12,
                      }}
                    />
                    <Area type="monotone" dataKey="deep" stackId="1" stroke="#a855f7" fill="#a855f7" fillOpacity={0.3} />
                    <Area type="monotone" dataKey="basic" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 flex items-center gap-5 text-xs text-[var(--muted)]">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-purple-500" /> Deep</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500" /> Basic</span>
              </div>
            </div>

            {/* Daily breakdown table */}
            <div className="surface-panel p-5">
              <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Daily breakdown (7 days)</div>
              <div className="mt-4 overflow-x-auto">
                <table className="data-table w-full">
                  <thead>
                    <tr>
                      <th className="text-left">Date</th>
                      <th className="text-right">Deep</th>
                      <th className="text-right">Basic</th>
                      <th className="text-right">Total</th>
                      <th className="text-right">Success</th>
                      <th className="text-right">Failed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {daily.map((row) => {
                      const dateStr = typeof row.snapshot_date === 'string'
                        ? row.snapshot_date
                        : (row.snapshot_date as any)?.value ?? '';
                      return (
                      <tr key={dateStr} className="data-row">
                        <td>{dateStr}</td>
                        <td className="text-right font-mono">{row.deep_count.toLocaleString()}</td>
                        <td className="text-right font-mono">{row.basic_count.toLocaleString()}</td>
                        <td className="text-right font-mono">{row.total_count.toLocaleString()}</td>
                        <td className="text-right font-mono text-[var(--success)]">{row.success_count.toLocaleString()}</td>
                        <td className="text-right font-mono text-[var(--danger)]">{row.failed_count.toLocaleString()}</td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>
    </AppShell>
  );
}
