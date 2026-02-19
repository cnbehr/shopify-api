import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboard, getStoreCategories } from '@/lib/bigquery';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tab = (searchParams.get('tab') || 'authority') as 'authority' | 'category' | 'tools';
  const category = searchParams.get('category') || undefined;
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 5000) : 50;

  try {
    const [stores, categories] = await Promise.all([
      getLeaderboard(tab, category, safeLimit),
      getStoreCategories(),
    ]);

    return NextResponse.json({ stores, categories });
  } catch (error) {
    console.error('Leaderboards API error:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboards' }, { status: 500 });
  }
}
