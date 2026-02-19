'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { SkeletonCard, DataCollecting } from '@/components/Skeleton';

interface CompareStore {
  domain: string;
  page_title: string;
  meta_description?: string;
  product_count?: number;
  price_min?: number;
  price_max?: number;
  price_avg?: number;
  primary_category: string;
  secondary_category?: string;
  pr_rank_position: number;
  referring_domains_count?: number;
  significance_score: number;
  percentile_rank?: string | null;
  tools: Array<{ app_name?: string; app_category?: string }>;
}

function getRankBadge(rank: string | null | undefined) {
  if (!rank) return { label: 'Unranked', className: 'badge-low' };
  if (rank.includes('0.001') || rank.includes('0.01')) return { label: rank, className: 'badge-elite' };
  if (rank.includes('0.1') || rank.includes('Top 1%')) return { label: rank, className: 'badge-high' };
  if (rank.includes('Top 10%')) return { label: rank, className: 'badge-good' };
  return { label: rank, className: 'badge-mid' };
}

export default function ComparePage() {
  const [searchInputs, setSearchInputs] = useState<string[]>(['', '', '']);
  const [stores, setStores] = useState<CompareStore[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasCompared, setHasCompared] = useState(false);
  const [error, setError] = useState('');

  const validDomains = searchInputs.filter(d => d.trim().length > 0);

  const compare = () => {
    if (validDomains.length < 2) return;
    setLoading(true);
    setHasCompared(true);
    setError('');

    const domainsParam = validDomains.map(d => d.trim()).join(',');
    fetch(`/api/compare?domains=${encodeURIComponent(domainsParam)}`)
      .then(r => {
        if (!r.ok) throw new Error('Compare failed');
        return r.json();
      })
      .then(data => {
        setStores(data.stores || []);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to compare stores. Please try again.');
        setLoading(false);
      });
  };

  const toolAnalysis = useMemo(() => {
    if (stores.length < 2) return null;

    const toolSets = stores.map(s =>
      new Set((s.tools || []).map(t => t.app_name || '').filter(Boolean))
    );

    // Shared by all stores
    const shared = Array.from(toolSets[0]).filter(t => toolSets.every(set => set.has(t)));

    // Unique to each store
    const unique = stores.map((_, i) =>
      Array.from(toolSets[i]).filter(t => toolSets.every((set, j) => j === i || !set.has(t)))
    );

    // Total unique tools across all
    const allTools = new Set(toolSets.flatMap(s => Array.from(s)));

    return { shared, unique, totalUnique: allTools.size };
  }, [stores]);

  return (
    <AppShell>
      <div className="fade-rise">
        <span className="pill pill-success">Analysis</span>
        <h2 className="mt-3 text-3xl font-bold">Store Comparison</h2>
        <p className="mt-2 text-[var(--muted)]">
          Compare tech stacks, authority, and products side by side.
        </p>

        {/* Domain inputs */}
        <div className="mt-6 surface-panel p-6">
          <h3 className="text-base font-semibold mb-4">Select stores to compare</h3>

          <div className="grid gap-3 md:grid-cols-3">
            {searchInputs.map((val, i) => (
              <input
                key={i}
                type="text"
                value={val}
                onChange={e => {
                  const next = [...searchInputs];
                  next[i] = e.target.value;
                  setSearchInputs(next);
                }}
                placeholder={`Store ${i + 1} domain...`}
                className="input"
              />
            ))}
          </div>

          <button
            onClick={compare}
            disabled={validDomains.length < 2 || loading}
            className="btn-primary mt-4"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
                Comparing...
              </span>
            ) : (
              `Compare ${validDomains.length} stores`
            )}
          </button>
        </div>

        {/* Comparison results */}
        {hasCompared && (
          <div className="mt-6 space-y-6 fade-rise-delay">
            {error ? (
              <div className="surface-panel p-8 text-center">
                <p className="text-sm text-[var(--danger)]">{error}</p>
                <button onClick={compare} className="mt-2 btn-ghost text-sm text-[var(--accent-strong)]">Try again</button>
              </div>
            ) : loading ? (
              <div className="grid gap-4 md:grid-cols-3">
                {Array.from({ length: validDomains.length }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : stores.length >= 2 ? (
              <>
                {/* Store cards side by side */}
                <div className="grid gap-4 md:grid-cols-3">
                  {stores.map(store => {
                    const badge = getRankBadge(store.percentile_rank);
                    return (
                      <div key={store.domain} className="surface-panel p-5">
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={`/stores/${store.domain}`}
                            className="text-lg font-bold text-[var(--accent-strong)] hover:underline"
                          >
                            {store.domain}
                          </Link>
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold shrink-0 ${badge.className}`}>
                            {badge.label}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-[var(--muted)] line-clamp-2">{store.page_title}</p>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div className="surface-muted p-3">
                            <div className="text-[10px] uppercase tracking-widest text-[var(--muted)]">Authority</div>
                            <div className="mt-1 text-xl font-bold text-[var(--ink-strong)]">
                              {(store.significance_score ?? 0).toFixed(1)}
                            </div>
                          </div>
                          <div className="surface-muted p-3">
                            <div className="text-[10px] uppercase tracking-widest text-[var(--muted)]">Products</div>
                            <div className="mt-1 text-xl font-bold text-[var(--ink-strong)]">
                              {store.product_count?.toLocaleString() || 'N/A'}
                            </div>
                          </div>
                          <div className="surface-muted p-3">
                            <div className="text-[10px] uppercase tracking-widest text-[var(--muted)]">Category</div>
                            <div className="mt-1 text-sm font-semibold text-[var(--ink-strong)]">
                              {store.primary_category}
                            </div>
                          </div>
                          <div className="surface-muted p-3">
                            <div className="text-[10px] uppercase tracking-widest text-[var(--muted)]">Avg Price</div>
                            <div className="mt-1 text-xl font-bold text-[var(--ink-strong)]">
                              {store.price_avg ? `$${store.price_avg.toFixed(0)}` : 'N/A'}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4">
                          <div className="text-[10px] uppercase tracking-widest text-[var(--muted)] mb-2">
                            Tools ({store.tools?.length || 0})
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {(store.tools || []).slice(0, 10).map((tool, i) => (
                              <span
                                key={i}
                                className="rounded-md border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-2 py-0.5 text-xs text-[var(--ink)]"
                              >
                                {tool.app_name}
                              </span>
                            ))}
                            {(store.tools?.length || 0) > 10 && (
                              <span className="text-xs text-[var(--muted)] px-2 py-0.5">
                                +{(store.tools?.length || 0) - 10} more
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Tool overlap analysis */}
                {toolAnalysis && (
                  <div className="surface-panel p-6">
                    <h3 className="text-lg font-semibold mb-4">Tech Stack Overlap</h3>

                    {/* Overlap indicator */}
                    <div className="surface-muted p-5 mb-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-[var(--ink-strong)]">Stack similarity</span>
                        <span className="text-sm font-mono text-[var(--accent-strong)]">
                          {toolAnalysis.totalUnique > 0
                            ? `${Math.round((toolAnalysis.shared.length / toolAnalysis.totalUnique) * 100)}%`
                            : '0%'
                          } overlap
                        </span>
                      </div>
                      <div className="h-3 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--purple)]"
                          style={{
                            width: toolAnalysis.totalUnique > 0
                              ? `${(toolAnalysis.shared.length / toolAnalysis.totalUnique) * 100}%`
                              : '0%'
                          }}
                        />
                      </div>
                      <div className="mt-2 flex justify-between text-xs text-[var(--muted)]">
                        <span>{toolAnalysis.shared.length} shared</span>
                        <span>{toolAnalysis.totalUnique} total unique tools</span>
                      </div>
                    </div>

                    {/* Shared tools */}
                    {toolAnalysis.shared.length > 0 && (
                      <div className="mb-5">
                        <h4 className="text-sm font-semibold text-[var(--ink-strong)] mb-2">
                          Shared tools ({toolAnalysis.shared.length})
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {toolAnalysis.shared.map(t => (
                            <span
                              key={t}
                              className="pill pill-success"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Unique to each */}
                    <div className="grid gap-4 md:grid-cols-3">
                      {stores.map((store, i) => (
                        <div key={store.domain}>
                          <h4 className="text-sm font-semibold text-[var(--ink-strong)] mb-2">
                            Only on {store.domain} ({toolAnalysis.unique[i]?.length || 0})
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {(toolAnalysis.unique[i] || []).map(t => (
                              <span
                                key={t}
                                className="rounded-md border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-2 py-0.5 text-xs text-[var(--ink)]"
                              >
                                {t}
                              </span>
                            ))}
                            {(toolAnalysis.unique[i]?.length || 0) === 0 && (
                              <span className="text-xs text-[var(--muted)]">No unique tools</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="surface-panel p-8 text-center">
                <p className="text-[var(--muted)]">
                  {stores.length === 1
                    ? 'Only 1 store found. Check that both domains are correct.'
                    : 'No stores found. Make sure you enter valid Shopify store domains.'
                  }
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
