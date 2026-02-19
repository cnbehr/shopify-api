import { NextRequest, NextResponse } from 'next/server';
import { getStoresByStack } from '@/lib/bigquery';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const toolIds = searchParams.get('tools')?.split(',').map(t => t.trim()).filter(Boolean).slice(0, 20) || [];

  if (toolIds.length === 0) {
    return NextResponse.json({ error: 'No tools specified' }, { status: 400 });
  }

  try {
    const stores = await getStoresByStack(toolIds, 50);
    return NextResponse.json({ stores });
  } catch (error) {
    console.error('Stack builder API error:', error);
    return NextResponse.json({ error: 'Failed to fetch stores by stack' }, { status: 500 });
  }
}
