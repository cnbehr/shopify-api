import { NextResponse } from 'next/server';
import { getTrendingTools } from '@/lib/bigquery';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = Math.min(parseInt(searchParams.get('days') || '7'), 30);
    const data = await getTrendingTools(days);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Trending tools error:', error);
    return NextResponse.json({ rising: [], declining: [] }, { status: 500 });
  }
}
