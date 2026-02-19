import { NextRequest, NextResponse } from 'next/server';
import { getStoresForComparison } from '@/lib/bigquery';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const domains = searchParams.get('domains')?.split(',').map(d => d.trim()).filter(Boolean) || [];

  if (domains.length === 0) {
    return NextResponse.json({ error: 'No domains specified' }, { status: 400 });
  }

  if (domains.length > 3) {
    return NextResponse.json({ error: 'Maximum 3 stores for comparison' }, { status: 400 });
  }

  try {
    const stores = await getStoresForComparison(domains);
    return NextResponse.json({ stores });
  } catch (error) {
    console.error('Compare API error:', error);
    return NextResponse.json({ error: 'Failed to fetch comparison data' }, { status: 500 });
  }
}
