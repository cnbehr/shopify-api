import { NextRequest, NextResponse } from 'next/server';
import { getSimilarStores } from '@/lib/bigquery';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get('domain');
  const limitStr = searchParams.get('limit');
  const limit = limitStr ? Math.min(parseInt(limitStr, 10), 30) : 10;

  if (!domain) {
    return NextResponse.json(
      { error: 'domain parameter is required' },
      { status: 400 }
    );
  }

  try {
    const similar = await getSimilarStores(domain, limit);

    if (!similar || similar.length === 0) {
      return NextResponse.json({ dataAvailable: false, similar: [] });
    }

    return NextResponse.json({ dataAvailable: true, similar });
  } catch (error) {
    console.error('Similar stores API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch similar stores' },
      { status: 500 }
    );
  }
}
