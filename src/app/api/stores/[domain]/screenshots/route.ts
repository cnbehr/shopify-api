import { NextRequest, NextResponse } from 'next/server';
import { getStoreScreenshots } from '@/lib/bigquery';

export async function GET(
  request: NextRequest,
  { params }: { params: { domain: string } }
) {
  try {
    const data = await getStoreScreenshots(decodeURIComponent(params.domain));
    return NextResponse.json(data);
  } catch (error) {
    console.error('Screenshots error:', error);
    return NextResponse.json({}, { status: 500 });
  }
}
