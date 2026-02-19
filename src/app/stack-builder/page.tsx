'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { SkeletonTable, DataCollecting } from '@/components/Skeleton';

interface Tool {
  tool_id: string;
  tool_name: string;
  category: string;
  store_count: number;
}

interface StackStore {
  domain: string;
  page_title: string;
  primary_category: string;
  pr_rank_position: number;
  significance_score: number;
  percentile_rank?: string | null;
  tools?: any[];
}

function getRankBadge(score: number) {
  if (score > 30) return 'badge-elite';
  if (score > 20) return 'badge-high';
  if (score > 10) return 'badge-good';
  if (score > 5) return 'badge-mid';
  return 'badge-low';
}

export default function StackBuilderPage() {
  const [allTools, setAllTools] = useState<Tool[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Tool[]>([]);
  const [stores, setStores] = useState<StackStore[]>([]);
  const [loading, setLoading] = useState(false);
  const [toolsLoading, setToolsLoading] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/tools')
      .then(r => r.json())
      .then(data => {
        setAllTools(data.tools || []);
        setToolsLoading(false);
      })
      .catch(() => {
        setToolsLoading(false);
      });
  }, []);

  const filteredTools = allTools.filter(t =>
    t.tool_name.toLowerCase().includes(search.toLowerCase()) &&
    !selected.some(s => s.tool_id === t.tool_id)
  ).slice(0, 12);

  const addTool = (tool: Tool) => {
    setSelected(prev => [...prev, tool]);
    setSearch('');
  };

  const removeTool = (toolId: string) => {
    setSelected(prev => prev.filter(t => t.tool_id !== toolId));
  };

  const findStores = useCallback(() => {
    if (selected.length === 0) return;
    setLoading(true);
    setHasSearched(true);
    setError('');

    const ids = selected.map(t => t.tool_id).join(',');
    fetch(`/api/stack-builder?tools=${encodeURIComponent(ids)}`)
      .then(r => {
        if (!r.ok) throw new Error('Search failed');
        return r.json();
      })
      .then(data => {
        setStores(data.stores || []);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to find stores. Please try again.');
        setStores([]);
        setLoading(false);
      });
  }, [selected]);

  return (
    <AppShell>
      <div className="fade-rise">
        <span className="pill-purple pill">Discovery</span>
        <h2 className="mt-3 text-3xl font-bold">Stack Builder</h2>
        <p className="mt-2 text-[var(--muted)]">
          Select tools to find stores running that exact combination.
        </p>

        {/* Tool picker */}
        <div className="mt-6 surface-panel p-6">
          <h3 className="text-base font-semibold mb-4">Build your stack</h3>

          {/* Selected tools */}
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selected.map(tool => (
                <span
                  key={tool.tool_id}
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-1.5 text-sm font-medium text-[var(--accent-strong)]"
                >
                  {tool.tool_name}
                  <button
                    onClick={() => removeTool(tool.tool_id)}
                    className="ml-1 text-[var(--accent-strong)] hover:text-white transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18" /><path d="M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Search input */}
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tools to add (e.g. Klaviyo, ReCharge, Gorgias)..."
              className="input"
            />

            {/* Dropdown */}
            {search.length > 0 && filteredTools.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-20 surface-card p-2 max-h-60 overflow-y-auto">
                {filteredTools.map(tool => (
                  <button
                    key={tool.tool_id}
                    onClick={() => addTool(tool)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm hover:bg-[rgba(255,255,255,0.05)] transition-colors text-left"
                  >
                    <div>
                      <span className="text-[var(--ink)] font-medium">{tool.tool_name}</span>
                      <span className="text-[var(--muted)] ml-2 text-xs">{tool.category}</span>
                    </div>
                    <span className="text-xs text-[var(--muted)]">{tool.store_count} stores</span>
                  </button>
                ))}
              </div>
            )}

            {search.length > 0 && filteredTools.length === 0 && !toolsLoading && (
              <div className="absolute left-0 right-0 top-full mt-1 z-20 surface-card p-4 text-center text-sm text-[var(--muted)]">
                No tools found matching &quot;{search}&quot;
              </div>
            )}
          </div>

          {/* Find button */}
          <button
            onClick={findStores}
            disabled={selected.length === 0 || loading}
            className="btn-primary mt-4"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
                Searching...
              </span>
            ) : (
              `Find stores with ${selected.length === 0 ? 'selected tools' : selected.length === 1 ? '1 tool' : `all ${selected.length} tools`}`
            )}
          </button>
        </div>

        {/* Results */}
        {hasSearched && (
          <div className="mt-6 surface-panel p-5 fade-rise-delay">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Matching stores</h3>
              <span className="text-xs text-[var(--muted)]">{stores.length} results</span>
            </div>

            {loading ? (
              <SkeletonTable rows={8} />
            ) : stores.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="text-left">#</th>
                      <th className="text-left">Store</th>
                      <th className="text-left">Category</th>
                      <th className="text-right">Tools</th>
                      <th className="text-right">Authority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stores.map((store, idx) => {
                      const toolCount = Array.isArray(store.tools) ? store.tools.length : 0;
                      return (
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
                          <td className="text-right font-mono text-sm">{toolCount}</td>
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
                <p className="text-[var(--muted)]">No stores found using all selected tools together</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
