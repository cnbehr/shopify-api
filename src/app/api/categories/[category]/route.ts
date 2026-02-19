import { NextResponse } from 'next/server';
import { getCategoryBenchmark } from '@/lib/bigquery';

export async function GET(
  request: Request,
  { params }: { params: { category: string } }
) {
  try {
    const category = decodeURIComponent(params.category);
    const data = await getCategoryBenchmark(category);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Category benchmark error:', error);
    return NextResponse.json({ error: 'Failed to load category data' }, { status: 500 });
  }
}
