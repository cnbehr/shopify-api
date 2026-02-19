import { NextResponse } from 'next/server';
import { getEnrichmentStatus } from '@/lib/bigquery';

export async function GET() {
  try {
    const status = await getEnrichmentStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error('Enrichment status API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch enrichment status' },
      { status: 500 }
    );
  }
}
