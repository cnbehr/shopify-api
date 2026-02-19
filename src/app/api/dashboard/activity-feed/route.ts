import { NextResponse } from 'next/server';
import { getActivityFeed } from '@/lib/bigquery';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const items = await getActivityFeed(limit);
    return NextResponse.json({ items });
  } catch (error) {
    console.error('Activity feed error:', error);
    return NextResponse.json({ items: [] }, { status: 500 });
  }
}
