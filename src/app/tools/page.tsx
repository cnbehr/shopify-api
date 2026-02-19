'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import AppShell from '@/components/AppShell';
import { SkeletonTable, DataCollecting, EmptyState } from '@/components/Skeleton';
import { TrendSparkline } from '@/components/TrendSparkline';
import type { ToolAnalytics } from '@/lib/toolAnalytics';

interface ToolTrend {
  tool_id: string;
  sparkline: number[];
  direction: 'up' | 'down' | 'flat';
}

interface Tool {
  tool_id: string;
  tool_name: string;
  category: string;
  store_count: number;
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

function getRankBadge(score: number) {
  if (score > 30) return 'badge-elite';
  if (score > 20) return 'badge-good';
  if (score > 10) return 'badge-mid';
  return 'badge-low';
}

export default function ToolsPage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<ToolAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [error, setError] = useState('');
  const [trends, setTrends] = useState<Map<string, ToolTrend>>(new Map());
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 300);
  }, []);

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  useEffect(() => {
    fetch('/api/tools/trends')
      .then(r => r.json())
      .then(data => {
        const map = new Map<string, ToolTrend>();
        for (const t of (data.trends || [])) {
          map.set(t.tool_id, t);
        }
        setTrends(map);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchTools();
  }, [debouncedSearch, category]);

  async function fetchTools() {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (category) params.set('category', category);
      const res = await fetch(`/api/tools?${params}`);
      if (!res.ok) throw new Error('Failed to load tools');
      const data = await res.json();
      setTools(data.tools || []);
      setCategories(data.categories || []);
    } catch {
      setError('Failed to load tools. Please try again.');
      setTools([]);
    } finally {
      setLoading(false);
    }
  }

  async function selectTool(toolId: string) {
    setSelectedTool(toolId);
    setStores([]);
    try {
      const res = await fetch(`/api/tools?toolId=${toolId}`);
      if (!res.ok) throw new Error('Failed to load stores');
      const data = await res.json();
      setStores(data.stores || []);
    } catch {
      setStores([]);
    }
  }

  const selectedToolInfo = tools.find(t => t.tool_id === selectedTool);

  useEffect(() => {
    if (!selectedTool) return;
    const controller = new AbortController();
    const fetchAnalytics = async () => {
      try {
        setAnalyticsLoading(true);
        const params = new URLSearchParams({ toolId: selectedTool });
        if (selectedToolInfo?.tool_name) params.set('toolName', selectedToolInfo.tool_name);
        const res = await fetch(`/api/tools/analytics?${params}`, { signal: controller.signal });
        const data = await res.json();
        setAnalytics(data);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setAnalytics(null);
        }
      } finally {
        setAnalyticsLoading(false);
      }
    };

    fetchAnalytics();
    return () => controller.abort();
  }, [selectedTool, selectedToolInfo?.tool_name]);

  return (
    <AppShell>
      <div className="fade-rise">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="pill">Tool intelligence</span>
            <h2 className="mt-3 text-3xl font-bold">Explore tool adoption</h2>
            <p className="mt-2 text-[var(--muted)]">
              Filter by category, inspect adoption counts, and surface the brands leading each stack.
            </p>
          </div>
          <div className="surface-muted grid gap-1.5 px-4 py-3 text-sm">
            <div className="flex items-center justify-between gap-6">
              <span className="text-[var(--muted)]">Tools indexed</span>
              <span className="font-semibold text-[var(--ink-strong)]">{tools.length}{tools.length >= 100 ? '+' : ''}</span>
            </div>
            <div className="flex items-center justify-between gap-6">
              <span className="text-[var(--muted)]">Categories</span>
              <span className="font-semibold text-[var(--ink-strong)]">{categories.length}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 surface-panel p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_200px]">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <input
                type="text"
                placeholder="Search tools, platforms, or vendors..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="input pl-9"
              />
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="select"
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="mt-4 surface-panel p-5 text-center">
            <p className="text-sm text-[var(--danger)]">{error}</p>
            <button onClick={fetchTools} className="mt-2 btn-ghost text-sm text-[var(--accent-strong)]">Try again</button>
          </div>
        )}

        <div className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.6fr]">
          <div className="surface-panel p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold">Tools</h3>
              <span className="text-xs text-[var(--muted)]">{tools.length} total</span>
            </div>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="skeleton h-14 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
                {tools.map(tool => (
                  <button
                    key={tool.tool_id}
                    onClick={() => selectTool(tool.tool_id)}
                    className={`w-full rounded-xl px-4 py-3 text-left transition-all duration-150 border ${
                      selectedTool === tool.tool_id
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                        : 'border-transparent hover:bg-[rgba(255,255,255,0.03)] hover:border-[var(--border)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-[var(--ink)]">{tool.tool_name}</div>
                        <div className="text-sm text-[var(--muted)]">
                          {tool.category} &middot; {tool.store_count.toLocaleString()} stores
                        </div>
                      </div>
                      {trends.get(tool.tool_id) && (
                        <TrendSparkline
                          data={trends.get(tool.tool_id)!.sparkline}
                          direction={trends.get(tool.tool_id)!.direction}
                        />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="surface-panel p-5">
            {selectedToolInfo ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-semibold">{selectedToolInfo.tool_name}</h3>
                      <p className="text-sm text-[var(--muted)]">Top stores by composite rank (with PR included)</p>
                  </div>
                  <Link
                    href={`/tools/${selectedToolInfo.tool_id}`}
                    className="btn-ghost text-sm text-[var(--accent-strong)]"
                  >
                    View full details &rarr;
                  </Link>
                </div>
                <div className="mt-4 overflow-x-auto">
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
              </>
            ) : (
              <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
                <svg className="text-[var(--muted)] opacity-30" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                <p className="mt-4 text-[var(--muted)]">Select a tool to see adoption leaders.</p>
              </div>
            )}
          </div>
        </div>

        {selectedToolInfo && (
          <div className="mt-8 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
            <div className="surface-panel p-6">
              <div className="flex items-center justify-between">
                <div>
                  <span className="pill">Usage over time</span>
                  <h3 className="mt-3 text-xl font-semibold">{selectedToolInfo.tool_name} adoption</h3>
                </div>
                <span className={`pill ${analytics?.data_source === 'bigquery' ? 'pill-success' : ''}`}>
                  {analytics?.data_source === 'bigquery' ? 'Live data' : 'Sample'}
                </span>
              </div>
              <div className="mt-5 h-56 rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
                {analyticsLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="skeleton h-full w-full rounded-lg" />
                  </div>
                ) : analytics && !analytics.dataAvailable ? (
                  <DataCollecting message="Adoption data collecting..." />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics?.usage || []} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="usageFill" x1="0" y1="0" x2="0" y2="1">
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
                      <Area type="monotone" dataKey="count" stroke="var(--accent)" strokeWidth={2} fill="url(#usageFill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="surface-panel p-5">
                <h4 className="text-base font-semibold">Notable wins</h4>
                <div className="mt-3 space-y-2">
                  {(analytics?.wins || []).length > 0 ? (
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
                  {(analytics?.losses || []).length > 0 ? (
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
        )}

        {selectedToolInfo && (
          <div className="mt-8 surface-panel p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="pill-purple pill">Switching activity</span>
                <h3 className="mt-3 text-xl font-semibold">Who moved where</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Track if a tool loss went to a competitor or to an internal build.
                </p>
              </div>
            </div>
            <div className="mt-5 overflow-x-auto">
              {(analytics?.switches || []).length > 0 ? (
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
              ) : (
                <EmptyState message="No switch events recorded" />
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
