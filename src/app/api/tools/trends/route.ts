import { NextResponse } from 'next/server';
import { getToolTrends } from '@/lib/bigquery';

export async function GET() {
  try {
    const trends = await getToolTrends();
    return NextResponse.json({ trends });
  } catch (error) {
    console.error('Tool trends error:', error);
    return NextResponse.json({ trends: [] }, { status: 500 });
  }
}
