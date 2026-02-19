import { NextRequest, NextResponse } from 'next/server';
import typesenseClient, { STORES_COLLECTION, TOOLS_COLLECTION } from '@/lib/typesense';
import { searchStores, getTools } from '@/lib/bigquery';

// Allowlist: alphanumeric, spaces, hyphens, ampersands, periods, commas
const SAFE_FILTER_RE = /^[a-zA-Z0-9 \-&.,]+$/;
const FILTER_INJECTION_RE = /[:=\[\]{}()|&]{2}|\|\|/;

function sanitizeFilterValue(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (FILTER_INJECTION_RE.test(trimmed)) return null;
  if (!SAFE_FILTER_RE.test(trimmed)) return null;
  return trimmed;
}

interface SearchResult {
  stores?: {
    hits: any[];
    found: number;
    facets: any[];
  };
  tools?: {
    hits: any[];
    found: number;
    facets: any[];
  };
  source: 'typesense' | 'bigquery';
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  const type = searchParams.get('type') || 'all'; // stores | tools | all
  const rawCategory = searchParams.get('category') || undefined;
  const rawToolsFilter = searchParams.get('tools') || undefined; // comma-separated tool names
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const perPage = Math.min(Math.max(1, parseInt(searchParams.get('per_page') || '20', 10) || 20), 100);

  // Sanitize filter inputs before use
  const category = rawCategory ? sanitizeFilterValue(rawCategory) ?? undefined : undefined;
  const toolsFilter = rawToolsFilter ? sanitizeFilterValue(rawToolsFilter) ?? undefined : undefined;

  if ((rawCategory && !category) || (rawToolsFilter && !toolsFilter)) {
    return NextResponse.json(
      { error: 'Invalid filter characters' },
      { status: 400 }
    );
  }

  if (!q) {
    return NextResponse.json({ error: 'Missing q parameter' }, { status: 400 });
  }

  try {
    const result = await searchTypesense(q, type, category, toolsFilter, page, perPage);
    return NextResponse.json(result);
  } catch (err) {
    console.error('Typesense search failed, falling back to BigQuery:', err);
    try {
      const result = await searchBigQueryFallback(q, type, category);
      return NextResponse.json(result);
    } catch (bqErr) {
      console.error('BigQuery fallback also failed:', bqErr);
      return NextResponse.json({ error: 'Search unavailable' }, { status: 503 });
    }
  }
}

async function searchTypesense(
  q: string,
  type: string,
  category: string | undefined,
  toolsFilter: string | undefined,
  page: number,
  perPage: number,
): Promise<SearchResult> {
  const searches: any[] = [];

  if (type === 'stores' || type === 'all') {
    let filterBy = '';
    const filters: string[] = [];
    if (category) {
      filters.push(`primary_category:=${category}`);
    }
    if (toolsFilter) {
      const toolNames = toolsFilter.split(',').map((t) => t.trim());
      filters.push(`tools:[${toolNames.join(',')}]`);
    }
    filterBy = filters.join(' && ');

    searches.push({
      collection: STORES_COLLECTION,
      q,
      query_by: 'domain,page_title,meta_description',
      filter_by: filterBy || undefined,
      sort_by: '_text_match:desc,composite_rank_score:desc,pr_rank:asc',
      facet_by: 'primary_category,tools',
      max_facet_values: 20,
      page,
      per_page: perPage,
      highlight_full_fields: 'domain,page_title',
    });
  }

  if (type === 'tools' || type === 'all') {
    let filterBy = '';
    if (category) {
      filterBy = `category:=${category}`;
    }

    searches.push({
      collection: TOOLS_COLLECTION,
      q,
      query_by: 'tool_name,category',
      filter_by: filterBy || undefined,
      sort_by: '_text_match:desc,store_count:desc',
      facet_by: 'category',
      max_facet_values: 20,
      page,
      per_page: perPage,
      highlight_full_fields: 'tool_name',
    });
  }

  const multiResult = await typesenseClient.multiSearch.perform(
    { searches },
    {},
  ) as any;

  const result: SearchResult = { source: 'typesense' };
  let idx = 0;

  if (type === 'stores' || type === 'all') {
    const storeResult = multiResult.results[idx++];
    result.stores = {
      hits: (storeResult.hits || []).map((h: any) => ({
        ...h.document,
        highlights: h.highlights,
        text_match: h.text_match,
      })),
      found: storeResult.found || 0,
      facets: storeResult.facet_counts || [],
    };
  }

  if (type === 'tools' || type === 'all') {
    const toolResult = multiResult.results[idx++];
    result.tools = {
      hits: (toolResult.hits || []).map((h: any) => ({
        ...h.document,
        highlights: h.highlights,
        text_match: h.text_match,
      })),
      found: toolResult.found || 0,
      facets: toolResult.facet_counts || [],
    };
  }

  return result;
}

async function searchBigQueryFallback(
  q: string,
  type: string,
  category: string | undefined,
): Promise<SearchResult> {
  const result: SearchResult = { source: 'bigquery' };

  if (type === 'stores' || type === 'all') {
    const stores = await searchStores(q, category);
    result.stores = {
      hits: stores,
      found: stores.length,
      facets: [],
    };
  }

  if (type === 'tools' || type === 'all') {
    const tools = await getTools(q, category);
    result.tools = {
      hits: tools,
      found: tools.length,
      facets: [],
    };
  }

  return result;
}
