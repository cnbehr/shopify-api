import { NextRequest, NextResponse } from 'next/server';
import { searchStores, getStoreDetails, getStoreCategories } from '@/lib/bigquery';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const domain = searchParams.get('domain');
  const category = searchParams.get('category') || undefined;

  try {
    if (domain) {
      // Get specific store details
      const store = await getStoreDetails(domain);
      if (!store) {
        return NextResponse.json({ error: 'Store not found' }, { status: 404 });
      }
      return NextResponse.json({ store });
    }

    if (!search) {
      // Return categories only
      const categories = await getStoreCategories();
      return NextResponse.json({ categories, stores: [] });
    }

    // Search stores
    const stores = await searchStores(search, category);
    const categories = await getStoreCategories();

    return NextResponse.json({ stores, categories });
  } catch (error) {
    console.error('Stores API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stores' },
      { status: 500 }
    );
  }
}
