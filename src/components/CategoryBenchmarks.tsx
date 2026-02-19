'use client';

import { useState, useEffect } from 'react';

interface BenchmarkData {
  avg_free_shipping_threshold: number;
  avg_product_count: number;
  avg_price: number;
  pct_subscription: number;
  pct_bundles: number;
  pct_plus: number;
  avg_tool_count: number;
}

interface StoreValues {
  product_count?: number;
  price_avg?: number;
  tool_count: number;
  has_subscription?: boolean;
  bundle_count?: number;
  is_shopify_plus?: boolean;
  free_shipping_threshold?: number;
}

interface CategoryBenchmarksProps {
  category: string;
  storeValues: StoreValues;
}

interface MetricRow {
  label: string;
  storeVal: number;
  categoryVal: number;
  unit?: string;
}

function ComparisonBar({ label, storeVal, categoryVal, unit }: MetricRow) {
  const maxVal = Math.max(storeVal, categoryVal, 1);

  const storePct = (storeVal / maxVal) * 100;
  const categoryPct = (categoryVal / maxVal) * 100;

  const formatVal = (v: number) => {
    if (unit === '$') return `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    return v.toLocaleString(undefined, { maximumFractionDigits: 1 });
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[var(--muted)]">{label}</span>
        <div className="flex items-center gap-3 tabular-nums">
          <span className="text-[var(--accent-strong)] font-medium">{formatVal(storeVal)}</span>
          <span className="text-[var(--muted)]">vs</span>
          <span className="text-[var(--muted)]">{formatVal(categoryVal)}</span>
        </div>
      </div>
      <div className="space-y-1">
        <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--accent)]"
            style={{ width: `${Math.max(storePct, 2)}%`, transition: 'width 0.5s ease' }}
          />
        </div>
        <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--muted)]"
            style={{ width: `${Math.max(categoryPct, 2)}%`, opacity: 0.5, transition: 'width 0.5s ease' }}
          />
        </div>
      </div>
    </div>
  );
}

export function CategoryBenchmarks({ category, storeValues }: CategoryBenchmarksProps) {
  const [benchmarks, setBenchmarks] = useState<BenchmarkData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/stores/_/benchmarks?category=${encodeURIComponent(category)}`)
      .then(r => r.json())
      .then(d => {
        setBenchmarks(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [category]);

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-10 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!benchmarks) return null;

  const metrics: MetricRow[] = [
    {
      label: 'Product count',
      storeVal: storeValues.product_count ?? 0,
      categoryVal: benchmarks.avg_product_count,
    },
    {
      label: 'Avg price',
      storeVal: storeValues.price_avg ?? 0,
      categoryVal: benchmarks.avg_price,
      unit: '$',
    },
    {
      label: 'Tool count',
      storeVal: storeValues.tool_count,
      categoryVal: benchmarks.avg_tool_count,
    },
    {
      label: 'Free shipping threshold',
      storeVal: storeValues.free_shipping_threshold ?? 0,
      categoryVal: benchmarks.avg_free_shipping_threshold,
      unit: '$',
    },
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h4 className="text-sm font-semibold text-[var(--ink-strong)]">
          vs {category} average
        </h4>
      </div>
      <div className="flex items-center gap-4 mb-4 text-[10px]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-1.5 rounded-full bg-[var(--accent)]" />
          This store
        </span>
        <span className="flex items-center gap-1.5 text-[var(--muted)]">
          <span className="inline-block w-3 h-1.5 rounded-full bg-[var(--muted)] opacity-50" />
          Category avg
        </span>
      </div>
      <div className="space-y-4">
        {metrics.map(m => (
          <ComparisonBar key={m.label} {...m} />
        ))}
      </div>
    </div>
  );
}
