'use client';

import { useEffect, useMemo, useState } from 'react';
import AppShell from '@/components/AppShell';
import { SkeletonCard } from '@/components/Skeleton';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

type QueueStatusRow = {
  status: string;
  count: number;
};

type RecentHttpStats = {
  total: number;
  ok_200: number;
  blocked: number;
  inactive: number;
  null_status: number;
};

type ErrorBreakdownRow = {
  error_message: string;
  count: number;
};

type ThroughputRow = {
  minute: string;
  total: number;
  ok_200: number;
  blocked: number;
};

type MonitorSnapshot = {
  queue_status: QueueStatusRow[];
  recent_http: RecentHttpStats;
  error_breakdown: ErrorBreakdownRow[];
  throughput: ThroughputRow[];
  generated_at: string;
};

type FreshnessData = {
  fresh_1d: number;
  fresh_7d: number;
  fresh_30d: number;
  never_enriched: number;
  total_active: number;
};

type JobRun = {
  mode: string;
  started_at: string;
  duration_seconds: number;
  stores_processed: number;
  success_count: number;
  failed_count: number;
};

type ChangeCategory = {
  category: string;
  change_count: number;
  store_count: number;
};

type ChangesSummary = {
  by_category: ChangeCategory[];
  total_stores_with_changes: number;
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

export default function MonitorPage() {
  const [snapshot, setSnapshot] = useState<MonitorSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [freshness, setFreshness] = useState<FreshnessData | null>(null);
  const [jobRuns, setJobRuns] = useState<JobRun[]>([]);
  const [changesSummary, setChangesSummary] = useState<ChangesSummary | null>(null);

  // Fetch freshness, job runs, and changes summary once on mount
  useEffect(() => {
    fetch('/api/monitor/freshness').then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(setFreshness).catch(() => {});
    fetch('/api/monitor/job-runs').then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(d => setJobRuns(d.runs || [])).catch(() => {});
    fetch('/api/monitor/changes-summary').then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(setChangesSummary).catch(() => {});
  }, []);

  useEffect(() => {
    let mounted = true;
    let timer: NodeJS.Timeout;

    const load = async () => {
      try {
        setError('');
        const res = await fetch('/api/monitor', { cache: 'no-store' });
        if (!res.ok) {
          throw new Error('Failed to load monitoring data');
        }
        const data = (await res.json()) as MonitorSnapshot;
        if (mounted) {
          setSnapshot(data);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError('Unable to load monitoring data.');
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

  const queueStatus = useMemo(() => snapshot?.queue_status || [], [snapshot]);
  const recentHttp = snapshot?.recent_http;
  const throughput = useMemo(() => snapshot?.throughput || [], [snapshot]);
  const errorBreakdown = useMemo(() => snapshot?.error_breakdown || [], [snapshot]);

  const successRate = recentHttp && recentHttp.total > 0
    ? ((recentHttp.ok_200 / recentHttp.total) * 100).toFixed(1)
    : null;

  return (
    <AppShell>
      <section className="space-y-6 fade-rise">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="pill-success pill">
                <StatusDot color="bg-emerald-400" />
                Operational
              </span>
            </div>
            <h1 className="mt-3 text-3xl font-bold">Mission control</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Enrichment pipeline health. Auto-refreshes every 30s.
            </p>
          </div>
          <div className="surface-muted px-4 py-2.5 text-xs text-[var(--muted)] flex items-center gap-2">
            <StatusDot color="bg-emerald-400" />
            {snapshot ? new Date(snapshot.generated_at).toLocaleTimeString() : 'Connecting...'}
          </div>
        </div>

        {loading && (
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {error && (
          <div className="surface-card border-[var(--danger-soft)] p-5 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        {!loading && !error && snapshot && (
          <>
            <div className="grid gap-3 md:grid-cols-5">
              <div className="surface-card stat-card p-4">
                <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Total (60m)</div>
                <div className="mt-2 text-2xl font-bold text-[var(--ink-strong)]">
                  {recentHttp?.total?.toLocaleString() ?? '0'}
                </div>
              </div>
              <div className="surface-card stat-card p-4">
                <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">HTTP 200</div>
                <div className="mt-2 text-2xl font-bold text-[var(--success)]">
                  {recentHttp?.ok_200?.toLocaleString() ?? '0'}
                </div>
              </div>
              <div className="surface-card stat-card p-4">
                <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Blocked</div>
                <div className="mt-2 text-2xl font-bold text-[var(--warning)]">
                  {recentHttp?.blocked?.toLocaleString() ?? '0'}
                </div>
              </div>
              <div className="surface-card stat-card p-4">
                <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Failed</div>
                <div className="mt-2 text-2xl font-bold text-[var(--danger)]">
                  {recentHttp?.null_status?.toLocaleString() ?? '0'}
                </div>
              </div>
              <div className="surface-card stat-card p-4">
                <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Success rate</div>
                <div className="mt-2 text-2xl font-bold text-[var(--ink-strong)]">
                  {successRate ? `${successRate}%` : 'N/A'}
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
              <div className="surface-panel p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Throughput</div>
                    <div className="mt-1 text-base font-semibold">HTTP snapshots per minute</div>
                  </div>
                  <span className="pill">last 60m</span>
                </div>
                <div className="mt-5 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={throughput}>
                      <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="minute" tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
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
                      <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="ok_200" stroke="#10b981" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="blocked" stroke="#f59e0b" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 flex items-center gap-5 text-xs text-[var(--muted)]">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500" /> Total</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Success</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" /> Blocked</span>
                </div>
              </div>

              <div className="surface-panel p-5 space-y-6">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Queue status</div>
                  <div className="mt-3 space-y-2.5">
                    {queueStatus.map((row) => (
                      <div key={row.status} className="flex items-center justify-between text-sm">
                        <span className="text-[var(--muted)]">{row.status}</span>
                        <span className="font-mono font-semibold text-[var(--ink)]">{row.count.toLocaleString()}</span>
                      </div>
                    ))}
                    {!queueStatus.length && (
                      <div className="text-sm text-[var(--muted)]">No queue data.</div>
                    )}
                  </div>
                </div>

                <div className="border-t border-[var(--border)] pt-4">
                  <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Top errors (60m)</div>
                  <div className="mt-3 space-y-2">
                    {errorBreakdown.map((row) => (
                      <div key={row.error_message} className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-[var(--muted)] truncate">{row.error_message}</span>
                        <span className="font-mono font-semibold text-[var(--danger)] shrink-0">{row.count.toLocaleString()}</span>
                      </div>
                    ))}
                    {!errorBreakdown.length && (
                      <div className="text-sm text-[var(--muted)]">No recent errors.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Enrichment Freshness Breakdown */}
            <div className="surface-panel p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Enrichment freshness</div>
                  <div className="mt-1 text-base font-semibold">Deep enrichment coverage</div>
                </div>
                <span className="pill">active stores</span>
              </div>
              {freshness ? (
                <div className="grid gap-3 md:grid-cols-5">
                  <div className="surface-muted p-4">
                    <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Fresh (1d)</div>
                    <div className="mt-2 text-2xl font-bold text-[var(--success)]">{freshness.fresh_1d.toLocaleString()}</div>
                  </div>
                  <div className="surface-muted p-4">
                    <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Fresh (7d)</div>
                    <div className="mt-2 text-2xl font-bold text-[var(--accent-strong)]">{freshness.fresh_7d.toLocaleString()}</div>
                  </div>
                  <div className="surface-muted p-4">
                    <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Fresh (30d)</div>
                    <div className="mt-2 text-2xl font-bold text-[var(--ink-strong)]">{freshness.fresh_30d.toLocaleString()}</div>
                  </div>
                  <div className="surface-muted p-4">
                    <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Never enriched</div>
                    <div className="mt-2 text-2xl font-bold text-[var(--warning)]">{freshness.never_enriched.toLocaleString()}</div>
                  </div>
                  <div className="surface-muted p-4">
                    <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Total active</div>
                    <div className="mt-2 text-2xl font-bold text-[var(--ink-strong)]">{freshness.total_active.toLocaleString()}</div>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="skeleton h-20 rounded-xl" />
                  ))}
                </div>
              )}
            </div>

            {/* Recent Job Runs */}
            <div className="surface-panel p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Job history</div>
                  <div className="mt-1 text-base font-semibold">Recent enrichment runs</div>
                </div>
                <span className="pill">last 14d</span>
              </div>
              {jobRuns.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="text-left">Mode</th>
                        <th className="text-left">Started</th>
                        <th className="text-right">Duration</th>
                        <th className="text-right">Processed</th>
                        <th className="text-right">Success</th>
                        <th className="text-right">Failed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobRuns.map((run, idx) => {
                        const failRate = run.stores_processed > 0 ? run.failed_count / run.stores_processed : 0;
                        const rowColor = failRate > 0.2 ? 'text-[var(--danger)]' : failRate > 0.05 ? 'text-[var(--warning)]' : 'text-[var(--success)]';
                        const mins = Math.floor(run.duration_seconds / 60);
                        const secs = run.duration_seconds % 60;
                        return (
                          <tr key={idx} className="data-row">
                            <td>
                              <span className="rounded-full bg-[var(--panel-muted)] border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--muted)]">
                                {run.mode}
                              </span>
                            </td>
                            <td className="text-sm text-[var(--muted)]">
                              {new Date(run.started_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="text-right font-mono text-sm text-[var(--muted)]">
                              {mins > 0 ? `${mins}m ${secs}s` : `${secs}s`}
                            </td>
                            <td className="text-right font-mono text-sm font-semibold text-[var(--ink)]">
                              {run.stores_processed.toLocaleString()}
                            </td>
                            <td className="text-right font-mono text-sm font-semibold text-[var(--success)]">
                              {run.success_count.toLocaleString()}
                            </td>
                            <td className={`text-right font-mono text-sm font-semibold ${rowColor}`}>
                              {run.failed_count.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-sm text-[var(--muted)]">No recent job runs found.</div>
              )}
            </div>

            {/* Change Detection Summary */}
            <div className="surface-panel p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Change detection</div>
                  <div className="mt-1 text-base font-semibold">Changes this week</div>
                </div>
                {changesSummary && (
                  <span className="pill">
                    {changesSummary.total_stores_with_changes.toLocaleString()} stores affected
                  </span>
                )}
              </div>
              {changesSummary ? (
                changesSummary.by_category.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
                    {changesSummary.by_category.map(cat => (
                      <div key={cat.category} className="surface-muted p-4">
                        <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">{cat.category}</div>
                        <div className="mt-2 text-2xl font-bold text-[var(--ink-strong)]">{cat.change_count.toLocaleString()}</div>
                        <div className="text-xs text-[var(--muted)]">{cat.store_count.toLocaleString()} stores</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-[var(--muted)]">No changes detected this week.</div>
                )
              ) : (
                <div className="grid gap-3 md:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="skeleton h-20 rounded-xl" />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </AppShell>
  );
}
