import { NextRequest, NextResponse } from 'next/server';
import { getStoreBenchmarks } from '@/lib/bigquery';

export async function GET(
  request: NextRequest,
  { params }: { params: { domain: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    if (!category) {
      return NextResponse.json({ error: 'category required' }, { status: 400 });
    }
    const data = await getStoreBenchmarks(category);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Benchmarks error:', error);
    return NextResponse.json({}, { status: 500 });
  }
}
