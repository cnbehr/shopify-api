'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface CategorySpotlight {
  primary_category: string;
  store_count: number;
  avg_authority: number;
  avg_price: number;
  top_tools: string[];
}

export default function CategorySpotlightGrid() {
  const [categories, setCategories] = useState<CategorySpotlight[]>([]);
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
    <div className="fade-rise-delay-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Category spotlight</h3>
        <span className="pill-purple pill text-[10px]">Market overview</span>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="surface-card p-5 space-y-4">
              <div className="skeleton h-5 w-32" />
              <div className="skeleton h-4 w-48" />
              <div className="flex gap-2">
                <div className="skeleton h-6 w-20 rounded-full" />
                <div className="skeleton h-6 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="surface-panel p-8 text-center">
          <p className="text-sm text-[var(--muted)]">No category data available</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map(cat => (
            <Link
              key={cat.primary_category}
              href={`/categories/${encodeURIComponent(cat.primary_category)}`}
              className="surface-card p-5 group hover:border-[rgba(139,92,246,0.2)] transition-all"
            >
              <h4 className="text-base font-semibold text-[var(--ink-strong)] group-hover:text-[var(--accent-strong)] transition-colors">
                {cat.primary_category}
              </h4>

              <div className="mt-3 grid grid-cols-3 gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Stores</div>
                  <div className="mt-1 text-lg font-bold text-[var(--ink-strong)]">
                    {cat.store_count.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Authority</div>
                  <div className="mt-1 text-lg font-bold text-[var(--ink-strong)]">
                    {cat.avg_authority.toFixed(1)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">Avg price</div>
                  <div className="mt-1 text-lg font-bold text-[var(--ink-strong)]">
                    ${cat.avg_price.toFixed(0)}
                  </div>
                </div>
              </div>

              {cat.top_tools && cat.top_tools.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {cat.top_tools.filter(Boolean).slice(0, 3).map(tool => (
                    <span
                      key={tool}
                      className="rounded-full bg-[rgba(255,255,255,0.04)] border border-[var(--border)] px-2 py-0.5 text-[10px] text-[var(--muted)]"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
