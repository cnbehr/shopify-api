import { NextResponse } from 'next/server';
import { BigQuery } from '@google-cloud/bigquery';

const bigquery = new BigQuery({ projectId: 'shopifydb' });
const DATASET = 'shopify_intelligence';

export async function GET() {
  try {
    const query = `
      SELECT
        change_category,
        COUNT(*) as change_count,
        COUNT(DISTINCT domain) as store_count
      FROM \`shopifydb.${DATASET}.store_changes\`
      WHERE change_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
      GROUP BY change_category
      ORDER BY change_count DESC
    `;

    const totalQuery = `
      SELECT COUNT(DISTINCT domain) as total_stores_with_changes
      FROM \`shopifydb.${DATASET}.store_changes\`
      WHERE change_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
    `;

    const [categoryRows, totalRows] = await Promise.all([
      bigquery.query({ query }).then(([rows]) => rows),
      bigquery.query({ query: totalQuery }).then(([rows]) => rows),
    ]);

    const by_category = (categoryRows as any[]).map(r => ({
      category: r.change_category,
      change_count: Number(r.change_count ?? 0),
      store_count: Number(r.store_count ?? 0),
    }));

    const total_stores_with_changes = Number((totalRows[0] as any)?.total_stores_with_changes ?? 0);

    return NextResponse.json({ by_category, total_stores_with_changes });
  } catch (error) {
    console.error('Changes summary API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch changes summary' },
      { status: 500 }
    );
  }
}
