import { NextRequest, NextResponse } from 'next/server';
import { getExploreStores } from '@/lib/bigquery';

// Category → color mapping (vibrant palette for dark bg)
const CATEGORY_COLORS: Record<string, string> = {
  'Fashion & Apparel': '#f472b6',
  'Beauty & Cosmetics': '#e879f9',
  'Health & Wellness': '#34d399',
  'Food & Beverage': '#fbbf24',
  'Home & Garden': '#60a5fa',
  'Electronics & Tech': '#22d3ee',
  'Sports & Outdoors': '#4ade80',
  'Jewelry & Accessories': '#c084fc',
  'Art & Design': '#fb923c',
  'Toys & Games': '#f87171',
  'Pets': '#a3e635',
  'Automotive': '#94a3b8',
  'Books & Media': '#a78bfa',
  'Business & Industrial': '#38bdf8',
  'Baby & Kids': '#fb7185',
  'Education': '#2dd4bf',
  'Uncategorized': '#6b7280',
};

// Category Y-axis ordering (digital top → physical bottom)
const CATEGORY_Y_MAP: Record<string, number> = {
  'Electronics & Tech': 0.05,
  'Art & Design': 0.12,
  'Books & Media': 0.18,
  'Education': 0.24,
  'Business & Industrial': 0.30,
  'Toys & Games': 0.38,
  'Pets': 0.44,
  'Baby & Kids': 0.50,
  'Health & Wellness': 0.55,
  'Beauty & Cosmetics': 0.60,
  'Jewelry & Accessories': 0.65,
  'Fashion & Apparel': 0.72,
  'Food & Beverage': 0.78,
  'Sports & Outdoors': 0.84,
  'Home & Garden': 0.90,
  'Automotive': 0.95,
  'Uncategorized': 0.50,
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get('limit') || 5000), 10000);

  try {
    const stores = await getExploreStores(limit);

    // Compute positions
    const maxScore = Math.max(...stores.map(s => s.significance_score), 1);
    const prices = stores.map(s => s.price_avg).filter(p => p > 0);
    const maxPrice = Math.min(Math.max(...prices, 1), 500); // Cap at $500

    const positioned = stores.map(s => {
      // X: avg price (mass-market left, luxury right) with jitter
      const priceNorm = Math.min(s.price_avg / maxPrice, 1);
      const x = priceNorm * 0.85 + 0.075; // Keep within 7.5%-92.5%

      // Y: category band + small jitter within band
      const catBase = CATEGORY_Y_MAP[s.primary_category] ?? 0.50;
      const jitter = (hashCode(s.domain) % 100) / 100 * 0.06 - 0.03;
      const y = Math.max(0.02, Math.min(0.98, catBase + jitter));

      return {
        d: s.domain,
        c: s.primary_category,
        s: s.significance_score,
        p: s.product_count,
        a: s.price_avg,
        t: s.tool_count,
        x,
        y,
      };
    });

    return NextResponse.json({
      stores: positioned,
      colors: CATEGORY_COLORS,
      total: stores.length,
    });
  } catch (error) {
    console.error('Explore API error:', error);
    return NextResponse.json({ error: 'Failed to load explore data' }, { status: 500 });
  }
}

// Simple deterministic hash for jitter
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}
