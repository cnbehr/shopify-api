import { NextRequest, NextResponse } from 'next/server';
import { getToolCooccurrence } from '@/lib/bigquery';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const toolId = searchParams.get('toolId');

  if (!toolId) {
    return NextResponse.json({ error: 'Missing toolId' }, { status: 400 });
  }

  try {
    const cooccurrence = await getToolCooccurrence(toolId, 15);
    return NextResponse.json({ cooccurrence });
  } catch (error) {
    console.error('Cooccurrence API error:', error);
    return NextResponse.json({ error: 'Failed to fetch cooccurrence data' }, { status: 500 });
  }
}
