import { NextResponse } from 'next/server';
import { BigQuery } from '@google-cloud/bigquery';

const bigquery = new BigQuery({ projectId: 'shopifydb' });
const DATASET = 'shopify_intelligence';

export async function GET() {
  try {
    // Derive job runs from enrichment_queue by grouping completed batches by date
    const query = `
      SELECT
        COALESCE(reason, 'unknown') as mode,
        MIN(started_at) as started_at,
        TIMESTAMP_DIFF(MAX(completed_at), MIN(started_at), SECOND) as duration_seconds,
        COUNT(*) as stores_processed,
        COUNTIF(status = 'completed') as success_count,
        COUNTIF(status = 'failed') as failed_count
      FROM \`shopifydb.${DATASET}.enrichment_queue\`
      WHERE status IN ('completed', 'failed')
        AND started_at IS NOT NULL
        AND started_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 14 DAY)
      GROUP BY reason, DATE(started_at)
      ORDER BY started_at DESC
      LIMIT 10
    `;

    const [rows] = await bigquery.query({ query });

    const runs = (rows as any[]).map(r => ({
      mode: r.mode,
      started_at: r.started_at?.value || r.started_at,
      duration_seconds: Number(r.duration_seconds ?? 0),
      stores_processed: Number(r.stores_processed ?? 0),
      success_count: Number(r.success_count ?? 0),
      failed_count: Number(r.failed_count ?? 0),
    }));

    return NextResponse.json({ runs });
  } catch (error) {
    console.error('Job runs API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job runs' },
      { status: 500 }
    );
  }
}
