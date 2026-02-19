'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import AppShell from '@/components/AppShell';
import { SkeletonCard, SkeletonTable, DataCollecting, EmptyState } from '@/components/Skeleton';
import type { ToolAnalytics } from '@/lib/toolAnalytics';

interface ToolAdoption {
  domain: string;
  date: string;
  description: string;
}

interface Store {
  domain: string;
  page_title: string;
  primary_category: string;
  composite_rank_score: number;
  pr_rank_position: number;
  significance_score: number;
  percentile_rank?: string | null;
  tools: string[];
}

interface CooccurrenceTool {
  tool_id: string;
  tool_name: string;
  tool_category: string;
  co_count: number;
}

function getRankBadge(score: number) {
  if (score > 30) return 'badge-elite';
  if (score > 20) return 'badge-good';
  if (score > 10) return 'badge-mid';
  return 'badge-low';
}

export default function ToolDetailPage() {
  const params = useParams();
  const toolId = params.toolId as string;
  const [stores, setStores] = useState<Store[]>([]);
  const [analytics, setAnalytics] = useState<ToolAnalytics | null>(null);
  const [cooccurrence, setCooccurrence] = useState<CooccurrenceTool[]>([]);
  const [toolName, setToolName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [cooccurrenceLoading, setCooccurrenceLoading] = useState(true);
  const [adoptionAdds, setAdoptionAdds] = useState<ToolAdoption[]>([]);
  const [adoptionRemoves, setAdoptionRemoves] = useState<ToolAdoption[]>([]);
  const [adoptionLoading, setAdoptionLoading] = useState(true);

  useEffect(() => {
    if (!toolId) return;

    // Fetch stores for this tool
    fetch(`/api/tools?toolId=${encodeURIComponent(toolId)}`)
      .then(r => { if (!r.ok) throw new Error('Failed'); return r.json(); })
      .then(data => {
        setStores(data.stores || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Fetch tool analytics
    const analyticsParams = new URLSearchParams({ toolId });
    fetch(`/api/tools/analytics?${analyticsParams}`)
      .then(r => { if (!r.ok) throw new Error('Failed'); return r.json(); })
      .then((data: ToolAnalytics) => {
        setAnalytics(data);
        if (data.tool_name) setToolName(data.tool_name);
        setAnalyticsLoading(false);
      })
      .catch(() => setAnalyticsLoading(false));

    // Fetch co-occurrence data
    fetch(`/api/tools/cooccurrence?toolId=${encodeURIComponent(toolId)}`)
      .then(r => { if (!r.ok) throw new Error('Failed'); return r.json(); })
      .then(data => {
        setCooccurrence(data.cooccurrence || []);
        setCooccurrenceLoading(false);
      })
      .catch(() => setCooccurrenceLoading(false));

    // Fetch recent adoption changes
    fetch(`/api/tools/${encodeURIComponent(toolId)}/changes`)
      .then(r => { if (!r.ok) throw new Error('Failed'); return r.json(); })
      .then(data => {
        setAdoptionAdds(data.adds || []);
        setAdoptionRemoves(data.removes || []);
        setAdoptionLoading(false);
      })
      .catch(() => setAdoptionLoading(false));
  }, [toolId]);

  return (
    <AppShell>
      <div className="fade-rise">
        <Link href="/tools" className="btn-ghost mb-4 inline-flex text-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
          Back to tools
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="pill">Tool profile</span>
            <h2 className="mt-3 text-3xl font-bold">{toolName || toolId}</h2>
            <p className="mt-1 text-[var(--muted)]">
              Adoption analytics and top stores using this tool
            </p>
          </div>
          <div className="surface-muted px-4 py-3 text-sm">
            <span className="text-[var(--muted)]">Stores using</span>{' '}
            <span className="font-semibold text-[var(--ink-strong)]">{stores.length}</span>
          </div>
        </div>

        {/* Analytics section */}
        <div className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <div className="surface-panel p-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="pill">Usage over time</span>
                <h3 className="mt-3 text-xl font-semibold">Adoption trend</h3>
              </div>
              <span className={`pill ${analytics?.data_source === 'bigquery' ? 'pill-success' : ''}`}>
                {analytics?.data_source === 'bigquery' ? 'Live data' : analyticsLoading ? '...' : 'Sample'}
              </span>
            </div>
            <div className="mt-5 h-56 rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
              {analyticsLoading ? (
                <div className="skeleton h-full w-full rounded-lg" />
              ) : analytics && !analytics.dataAvailable ? (
                <DataCollecting message="Adoption data collecting..." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics?.usage || []} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="toolFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 10,
                        border: '1px solid var(--border)',
                        background: 'var(--panel-solid)',
                        color: 'var(--ink)',
                        boxShadow: 'var(--shadow-soft)',
                      }}
                    />
                    <Area type="monotone" dataKey="count" stroke="var(--accent)" strokeWidth={2} fill="url(#toolFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="surface-panel p-5">
              <h4 className="text-base font-semibold">Notable wins</h4>
              <div className="mt-3 space-y-2">
                {!analyticsLoading && (analytics?.wins || []).length > 0 ? (
                  analytics!.wins.map((win) => (
                    <div key={win.domain} className="rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-2.5">
                      <div className="font-medium text-[var(--ink)] text-sm">{win.domain}</div>
                      <div className="text-xs text-[var(--muted)]">{win.note}</div>
                    </div>
                  ))
                ) : (
                  <EmptyState message="No recent wins recorded" />
                )}
              </div>
            </div>
            <div className="surface-panel p-5">
              <h4 className="text-base font-semibold">Notable losses</h4>
              <div className="mt-3 space-y-2">
                {!analyticsLoading && (analytics?.losses || []).length > 0 ? (
                  analytics!.losses.map((loss) => (
                    <div key={loss.domain} className="rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-2.5">
                      <div className="font-medium text-[var(--ink)] text-sm">{loss.domain}</div>
                      <div className="text-xs text-[var(--muted)]">{loss.note}</div>
                    </div>
                  ))
                ) : (
                  <EmptyState message="No recent losses recorded" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Commonly used with */}
        <div className="mt-6 surface-panel p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Commonly used with</h3>
            {cooccurrence.length > 0 && (
              <span className="text-xs text-[var(--muted)]">{cooccurrence.length} tools</span>
            )}
          </div>
          <div className="mt-4">
            {cooccurrenceLoading ? (
              <div className="flex flex-wrap gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="skeleton h-10 w-32 rounded-xl" />
                ))}
              </div>
            ) : cooccurrence.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {cooccurrence.map((tool) => {
                  const maxCount = cooccurrence[0]?.co_count || 1;
                  const intensity = Math.max(0.3, tool.co_count / maxCount);
                  return (
                    <Link
                      key={tool.tool_id}
                      href={`/tools/${tool.tool_id}`}
                      className="group relative rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-3.5 py-2 transition-all hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
                    >
                      <span className="text-sm font-medium text-[var(--ink)] group-hover:text-[var(--accent-strong)]">
                        {tool.tool_name}
                      </span>
                      <span className="ml-2 text-xs text-[var(--muted)]">{tool.co_count}</span>
                      <div
                        className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-[var(--accent)]"
                        style={{ opacity: intensity }}
                      />
                    </Link>
                  );
                })}
              </div>
            ) : (
              <EmptyState message="No co-occurrence data available" />
            )}
          </div>
        </div>

        {/* Recent Adoption */}
        <div className="mt-6 surface-panel p-6">
          <h3 className="text-lg font-semibold mb-4">Recent adoption</h3>
          {adoptionLoading ? (
            <div className="grid gap-3 md:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="skeleton h-32 rounded-xl" />
              ))}
            </div>
          ) : adoptionAdds.length === 0 && adoptionRemoves.length === 0 ? (
            <EmptyState message="No recent adoption changes" />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="text-sm font-semibold text-[var(--success)] mb-3 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                  Recent adds ({adoptionAdds.length})
                </h4>
                <div className="space-y-2">
                  {adoptionAdds.length > 0 ? adoptionAdds.slice(0, 10).map((item, idx) => (
                    <div key={idx} className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5">
                      <Link href={`/stores/${item.domain}`} className="font-medium text-sm text-[var(--ink)] hover:text-[var(--accent-strong)] hover:underline">
                        {item.domain}
                      </Link>
                      <div className="text-xs text-[var(--muted)]">
                        {typeof item.date === 'object' && item.date !== null ? String((item.date as any).value || '') : String(item.date || '')}
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-[var(--muted)]">No recent adds</p>
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[var(--danger)] mb-3 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
                  Recent removes ({adoptionRemoves.length})
                </h4>
                <div className="space-y-2">
                  {adoptionRemoves.length > 0 ? adoptionRemoves.slice(0, 10).map((item, idx) => (
                    <div key={idx} className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2.5">
                      <Link href={`/stores/${item.domain}`} className="font-medium text-sm text-[var(--ink)] hover:text-[var(--accent-strong)] hover:underline">
                        {item.domain}
                      </Link>
                      <div className="text-xs text-[var(--muted)]">
                        {typeof item.date === 'object' && item.date !== null ? String((item.date as any).value || '') : String(item.date || '')}
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-[var(--muted)]">No recent removes</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Top stores table */}
        <div className="mt-6 surface-panel p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Top stores</h3>
            <span className="text-xs text-[var(--muted)]">{stores.length} stores</span>
          </div>
          {loading ? (
            <SkeletonTable rows={8} />
          ) : stores.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                      <tr>
                        <th className="pb-1 text-left">Rank</th>
                        <th className="pb-1 text-left">Store</th>
                        <th className="pb-1 text-left">Category</th>
                        <th className="pb-1 text-right">Composite Rank</th>
                        <th className="pb-1 text-right">Authority</th>
                  </tr>
                </thead>
                <tbody>
                  {stores.map((store, idx) => (
                    <tr key={store.domain} className="data-row">
                      <td className="text-[var(--muted)] text-sm">#{idx + 1}</td>
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
                            {Number(store.composite_rank_score ?? 0).toFixed(3)}
                          </td>
                      <td className="text-right">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getRankBadge(store.significance_score)}`}>
                          {(store.significance_score ?? 0).toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState message="No stores found using this tool" />
          )}
        </div>

        {/* Switching activity */}
        {!analyticsLoading && (analytics?.switches || []).length > 0 && (
          <div className="mt-6 surface-panel p-6">
            <div>
              <span className="pill-purple pill">Switching activity</span>
              <h3 className="mt-3 text-xl font-semibold">Who moved where</h3>
            </div>
            <div className="mt-5 overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="text-left">Store</th>
                    <th className="text-left">From</th>
                    <th className="text-left">To</th>
                    <th className="text-right">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics!.switches.map((move) => (
                    <tr key={`${move.domain}-${move.change_date}`} className="data-row">
                      <td className="font-medium text-[var(--ink)]">{move.domain}</td>
                      <td className="text-sm text-[var(--muted)]">{move.from_tool}</td>
                      <td className="text-sm text-[var(--muted)]">{move.to_tool}</td>
                      <td className="text-right text-sm text-[var(--muted)]">{move.change_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
