import { NextRequest, NextResponse } from 'next/server';
import { getTools, getStoresForTool, getToolCategories } from '@/lib/bigquery';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || undefined;
  const category = searchParams.get('category') || undefined;
  const toolId = searchParams.get('toolId');

  try {
    if (toolId) {
      // Get stores for specific tool
      const stores = await getStoresForTool(toolId, 50);
      return NextResponse.json({ stores });
    }

    // Get tools list
    const tools = await getTools(search, category);
    const categories = await getToolCategories();

    return NextResponse.json({ tools, categories });
  } catch (error) {
    console.error('Tools API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tools' },
      { status: 500 }
    );
  }
}
