import { NextResponse } from 'next/server';
import { getMonitoringSnapshot } from '@/lib/bigquery';

export async function GET() {
  try {
    const snapshot = await getMonitoringSnapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error('Monitor API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monitoring data' },
      { status: 500 }
    );
  }
}
