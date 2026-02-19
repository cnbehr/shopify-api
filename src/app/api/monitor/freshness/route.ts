import { NextResponse } from 'next/server';
import { BigQuery } from '@google-cloud/bigquery';

const bigquery = new BigQuery({ projectId: 'shopifydb' });
const DATASET = 'shopify_intelligence';

export async function GET() {
  try {
    const query = `
      SELECT
        COUNTIF(last_deep_enriched_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 DAY)) as fresh_1d,
        COUNTIF(last_deep_enriched_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)) as fresh_7d,
        COUNTIF(last_deep_enriched_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)) as fresh_30d,
        COUNTIF(last_deep_enriched_at IS NULL) as never_enriched,
        COUNT(*) as total_active
      FROM \`shopifydb.${DATASET}.stores\`
      WHERE is_active = TRUE
    `;

    const [rows] = await bigquery.query({ query });
    const row = rows[0] as any;

    return NextResponse.json({
      fresh_1d: Number(row?.fresh_1d ?? 0),
      fresh_7d: Number(row?.fresh_7d ?? 0),
      fresh_30d: Number(row?.fresh_30d ?? 0),
      never_enriched: Number(row?.never_enriched ?? 0),
      total_active: Number(row?.total_active ?? 0),
    });
  } catch (error) {
    console.error('Freshness API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch freshness data' },
      { status: 500 }
    );
  }
}
