import { NextResponse } from 'next/server';
import { getPlatformStats } from '@/lib/bigquery';

export async function GET() {
  try {
    const stats = await getPlatformStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
  }
}
