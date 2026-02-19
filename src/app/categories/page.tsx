'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { SkeletonCard } from '@/components/Skeleton';

interface CategoryItem {
  primary_category: string;
  store_count: number;
  avg_authority: number;
  avg_price: number;
  top_tools: string[];
}

function getRankBadge(score: number) {
  if (score > 30) return 'badge-elite';
  if (score > 20) return 'badge-high';
  if (score > 10) return 'badge-good';
  if (score > 5) return 'badge-mid';
  return 'badge-low';
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/category-spotlight')
      .then(r => r.json())
      .then(data => {
        setCategories(data.categories || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <div className="fade-rise">
        <span className="pill pill-cyan">Categories</span>
        <h2 className="mt-3 text-3xl font-bold">Categories</h2>
        <p className="mt-2 text-[var(--muted)]">
          Browse Shopify store categories and benchmark against market averages.
        </p>

        {loading ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : categories.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => (
              <Link
                key={cat.primary_category}
                href={`/categories/${encodeURIComponent(cat.primary_category)}`}
                className="surface-card p-5 group transition-all hover:border-[var(--accent)] hover:shadow-[var(--shadow-glow)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-semibold text-[var(--ink-strong)] group-hover:text-[var(--accent-strong)] transition-colors">
                    {cat.primary_category}
                  </h3>
                  <span className="rounded-full bg-[var(--panel-muted)] border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--muted)] flex-shrink-0">
                    {cat.store_count} stores
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Avg authority</div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${getRankBadge(cat.avg_authority)}`}>
                        {cat.avg_authority.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Avg price</div>
                    <div className="mt-1 text-sm font-semibold text-[var(--ink-strong)]">
                      {cat.avg_price ? `$${cat.avg_price.toFixed(0)}` : 'N/A'}
                    </div>
                  </div>
                </div>

                {cat.top_tools && cat.top_tools.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {cat.top_tools.slice(0, 3).map((tool) => (
                      <span
                        key={tool}
                        className="rounded bg-[rgba(255,255,255,0.04)] border border-[var(--border)] px-2 py-0.5 text-[10px] text-[var(--muted)]"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-8 surface-panel p-10 text-center">
            <p className="text-[var(--muted)]">No category data available yet.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
