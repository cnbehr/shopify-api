'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { SkeletonStoreCard, SkeletonTable } from '@/components/Skeleton';

interface Store {
  domain: string;
  page_title: string;
  meta_description?: string;
  product_count?: number;
  price_min?: number;
  price_max?: number;
  price_avg?: number;
  primary_category: string;
  secondary_category?: string;
  category_confidence?: number;
  composite_rank_score: number;
  pr_rank_position: number;
  referring_domains_count?: number;
  significance_score: number;
  percentile_rank?: string | null;
  tools: any[];
}

function getRankBadge(score: number) {
  if (score > 30) return 'badge-elite';
  if (score > 20) return 'badge-good';
  if (score > 10) return 'badge-mid';
  return 'badge-low';
}

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 300);
  }, []);

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  useEffect(() => {
    if (debouncedSearch) {
      searchStores(debouncedSearch, category);
    }
  }, [debouncedSearch, category]);

  async function fetchCategories() {
    try {
      const res = await fetch('/api/stores');
      if (!res.ok) return;
      const data = await res.json();
      setCategories(data.categories || []);
    } catch {
      // Categories are non-critical, silently fail
    }
  }

  async function searchStores(q: string, cat: string) {
    if (!q) return;
    setLoading(true);
    setHasSearched(true);
    setError('');
    try {
      const params = new URLSearchParams({ search: q });
      if (cat) params.set('category', cat);
      const res = await fetch(`/api/stores?${params}`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setStores(data.stores || []);
      setCategories(data.categories || []);
    } catch {
      setError('Search failed. Please try again.');
      setStores([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="fade-rise">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="pill">Store discovery</span>
            <h2 className="mt-3 text-3xl font-bold">Search Shopify stores</h2>
            <p className="mt-2 text-[var(--muted)]">Discover brand authority, category fit, and tech stack.</p>
          </div>
        </div>

        <div className="mt-6 surface-panel p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <input
                type="text"
                placeholder="Search by domain or name..."
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
            <button
              onClick={() => searchStores(search, category)}
              disabled={!search}
              className="btn-primary"
            >
              Search
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-6 surface-panel p-8 text-center">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-red-400 mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
            </div>
            <p className="text-sm text-[var(--danger)]">{error}</p>
            <button onClick={() => searchStores(search, category)} className="mt-3 btn-ghost text-sm text-[var(--accent-strong)]">Try again</button>
          </div>
        ) : loading ? (
          <div className="mt-6 surface-panel p-5">
            <SkeletonTable rows={6} />
          </div>
        ) : stores.length > 0 ? (
          <div className="mt-6 surface-panel p-4 overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="text-left">Store</th>
                  <th className="text-left">Category</th>
                  <th className="text-right">Composite Rank</th>
                  <th className="text-right">Authority</th>
                  <th className="text-right">Tools</th>
                </tr>
              </thead>
              <tbody>
                {stores.map((store) => (
                  <tr key={store.domain} className="data-row">
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
                    <td className="text-right font-mono text-sm text-[var(--ink)]">
                      {Number(store.composite_rank_score ?? 0).toFixed(3)}
                    </td>
                    <td className="text-right">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getRankBadge(store.significance_score)}`}>
                        {(store.significance_score ?? 0).toFixed(1)}
                      </span>
                    </td>
                    <td className="text-right text-sm text-[var(--muted)]">
                      {store.tools?.length || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {stores.length >= 50 && (
              <p className="text-xs text-[var(--muted)] text-center mt-3">Showing first 50 results. Refine your search for more specific results.</p>
            )}
          </div>
        ) : hasSearched ? (
          <div className="mt-8 surface-panel p-10 text-center">
            <p className="text-[var(--muted)]">No stores found. Try a different search.</p>
          </div>
        ) : (
          <div className="mt-8 surface-panel p-10 text-center">
            <div className="text-3xl mb-3 opacity-30">
              <svg className="inline" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </div>
            <p className="text-[var(--muted)]">Enter a search term to discover stores.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
