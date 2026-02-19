'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { SkeletonCard, SkeletonTable } from '@/components/Skeleton';

interface CategoryOverview {
  store_count: number;
  avg_authority: number;
  avg_price: number;
  avg_products: number;
  shopify_plus_count: number;
  free_shipping_pct: number;
  avg_free_shipping_threshold: number;
}

interface Store {
  domain: string;
  page_title: string;
  primary_category: string;
  pr_rank_position: number;
  significance_score: number;
  percentile_rank?: string | null;
  tools: any[];
}

interface ToolAdoption {
  tool_name: string;
  category_rate: number;
  market_rate: number;
}

interface ToolPair {
  tool_a: string;
  tool_b: string;
  pair_count: number;
}

interface CategoryData {
  overview: CategoryOverview;
  top_stores: Store[];
  tool_adoption: ToolAdoption[];
  typical_stack: ToolPair[];
}

function getRankBadge(score: number) {
  if (score > 30) return 'badge-elite';
  if (score > 20) return 'badge-high';
  if (score > 10) return 'badge-good';
  if (score > 5) return 'badge-mid';
  return 'badge-low';
}

function ToolAdoptionBar({ tool }: { tool: ToolAdoption }) {
  const maxRate = Math.max(tool.category_rate, tool.market_rate, 1);

  return (
    <div className="py-3 border-b border-[var(--border)] last:border-0">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-[var(--ink)]">{tool.tool_name}</span>
        <div className="flex items-center gap-4 text-xs tabular-nums">
          <span className="text-[var(--accent-strong)]">{tool.category_rate.toFixed(1)}%</span>
          <span className="text-[var(--muted)]">{tool.market_rate.toFixed(1)}%</span>
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[var(--muted)] w-16 flex-shrink-0">Category</span>
          <div className="flex-1 h-2 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--accent)]"
              style={{ width: `${(tool.category_rate / maxRate) * 100}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[var(--muted)] w-16 flex-shrink-0">Market</span>
          <div className="flex-1 h-2 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[rgba(255,255,255,0.15)]"
              style={{ width: `${(tool.market_rate / maxRate) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CategoryDetailPage() {
  const params = useParams();
  const categorySlug = params.category as string;
  const category = decodeURIComponent(categorySlug);

  const [data, setData] = useState<CategoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!categorySlug) return;
    setLoading(true);
    fetch(`/api/categories/${encodeURIComponent(category)}`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to load');
        return r.json();
      })
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load category data');
        setLoading(false);
      });
  }, [categorySlug, category]);

  const sortedAdoption = data?.tool_adoption
    ? [...data.tool_adoption].sort((a, b) => b.category_rate - a.category_rate)
    : [];

  const sortedStack = data?.typical_stack
    ? [...data.typical_stack].sort((a, b) => b.pair_count - a.pair_count)
    : [];

  return (
    <AppShell>
      <div className="fade-rise">
        <Link href="/categories" className="btn-ghost mb-4 inline-flex text-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
          Back to categories
        </Link>

        {loading ? (
          <div className="space-y-4">
            <div className="skeleton h-10 w-64 rounded-xl" />
            <div className="skeleton h-5 w-96 rounded-lg" />
            <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6 mt-6">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          </div>
        ) : error ? (
          <div className="surface-panel p-8 text-center">
            <p className="text-[var(--muted)]">{error}</p>
          </div>
        ) : data ? (
          <>
            {/* Header */}
            <div className="surface-panel p-6">
              <span className="pill pill-cyan">Category benchmark</span>
              <h2 className="mt-3 text-3xl font-bold">{category}</h2>
              <p className="mt-2 text-[var(--muted)]">
                Category-level benchmarks and competitive intelligence for {category} stores.
              </p>

              {/* Overview stat grid */}
              <div className="mt-6 grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                <div className="surface-muted p-4">
                  <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Stores</div>
                  <div className="mt-2 text-2xl font-bold text-[var(--ink-strong)]">
                    {data.overview.store_count.toLocaleString()}
                  </div>
                </div>
                <div className="surface-muted p-4">
                  <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Avg authority</div>
                  <div className="mt-2 text-2xl font-bold text-[var(--ink-strong)]">
                    {data.overview.avg_authority.toFixed(1)}
                  </div>
                </div>
                <div className="surface-muted p-4">
                  <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Avg price</div>
                  <div className="mt-2 text-2xl font-bold text-[var(--ink-strong)]">
                    {data.overview.avg_price ? `$${data.overview.avg_price.toFixed(0)}` : 'N/A'}
                  </div>
                </div>
                <div className="surface-muted p-4">
                  <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Avg products</div>
                  <div className="mt-2 text-2xl font-bold text-[var(--ink-strong)]">
                    {data.overview.avg_products ? Math.round(data.overview.avg_products).toLocaleString() : 'N/A'}
                  </div>
                </div>
                <div className="surface-muted p-4">
                  <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Shopify Plus</div>
                  <div className="mt-2 text-2xl font-bold text-[var(--ink-strong)]">
                    {data.overview.shopify_plus_count}
                  </div>
                </div>
                <div className="surface-muted p-4">
                  <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Free shipping</div>
                  <div className="mt-2 text-2xl font-bold text-[var(--ink-strong)]">
                    {data.overview.free_shipping_pct}%
                  </div>
                  {data.overview.avg_free_shipping_threshold > 0 && (
                    <div className="text-xs text-[var(--muted)]">
                      avg ${data.overview.avg_free_shipping_threshold.toFixed(0)} threshold
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tool Adoption + Typical Stack */}
            <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
              {/* Tool Adoption */}
              <div className="surface-panel p-6 fade-rise-delay">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Tool adoption</h3>
                  <div className="flex items-center gap-4 text-[10px] uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[var(--accent)]" />
                      <span className="text-[var(--muted)]">Category</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[rgba(255,255,255,0.15)]" />
                      <span className="text-[var(--muted)]">Market</span>
                    </span>
                  </div>
                </div>
                {sortedAdoption.length > 0 ? (
                  <div>
                    {sortedAdoption.map((tool) => (
                      <ToolAdoptionBar key={tool.tool_name} tool={tool} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-[var(--muted)]">No tool adoption data available.</p>
                  </div>
                )}
              </div>

              {/* Typical Stack */}
              <div className="surface-panel p-6 fade-rise-delay-2">
                <h3 className="text-lg font-semibold mb-4">Typical stack</h3>
                <p className="text-xs text-[var(--muted)] mb-4">
                  Common tool pairs seen together in {category} stores.
                </p>
                {sortedStack.length > 0 ? (
                  <div className="space-y-2">
                    {sortedStack.map((pair, i) => (
                      <div
                        key={`${pair.tool_a}-${pair.tool_b}`}
                        className="surface-muted p-3 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-xs font-mono text-[var(--muted)] w-5 flex-shrink-0">{i + 1}</span>
                          <span className="text-sm text-[var(--ink)] truncate">
                            {pair.tool_a}
                            <span className="text-[var(--muted)] mx-1.5">+</span>
                            {pair.tool_b}
                          </span>
                        </div>
                        <span className="rounded-full bg-[var(--panel-muted)] border border-[var(--border)] px-2.5 py-0.5 text-xs font-medium text-[var(--muted)] flex-shrink-0 tabular-nums">
                          {pair.pair_count}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-[var(--muted)]">No stack data available.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Top Stores */}
            <div className="mt-4 surface-panel p-5 fade-rise-delay-2">
              <h3 className="text-lg font-semibold mb-4">Top stores</h3>
              {data.top_stores.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="text-left w-12">#</th>
                        <th className="text-left">Store</th>
                        <th className="text-right">Authority</th>
                        <th className="text-right">Percentile</th>
                        <th className="text-right">Tools</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.top_stores.map((store, idx) => {
                        const toolCount = Array.isArray(store.tools) ? store.tools.length : 0;
                        return (
                          <tr key={store.domain} className="data-row">
                            <td className="text-sm text-[var(--muted)] font-mono">
                              {idx + 1}
                            </td>
                            <td>
                              <Link
                                href={`/stores/${encodeURIComponent(store.domain)}`}
                                className="font-semibold text-[var(--accent-strong)] hover:underline"
                              >
                                {store.domain}
                              </Link>
                              <div className="text-xs text-[var(--muted)] truncate max-w-xs">
                                {store.page_title}
                              </div>
                            </td>
                            <td className="text-right">
                              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getRankBadge(store.significance_score)}`}>
                                {store.significance_score.toFixed(1)}
                              </span>
                            </td>
                            <td className="text-right text-sm text-[var(--muted)]">
                              {store.percentile_rank || 'Unranked'}
                            </td>
                            <td className="text-right text-sm text-[var(--muted)]">
                              {toolCount}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-[var(--muted)]">No stores found in this category.</p>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
