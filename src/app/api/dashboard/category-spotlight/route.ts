import { NextResponse } from 'next/server';
import { getCategorySpotlight } from '@/lib/bigquery';

export async function GET() {
  try {
    const categories = await getCategorySpotlight();
    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Category spotlight error:', error);
    return NextResponse.json({ categories: [] }, { status: 500 });
  }
}
