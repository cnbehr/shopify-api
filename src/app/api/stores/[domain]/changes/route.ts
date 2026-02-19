import { NextRequest, NextResponse } from 'next/server';
import { BigQuery } from '@google-cloud/bigquery';

const bigquery = new BigQuery({ projectId: 'shopifydb' });
const DATASET = 'shopify_intelligence';

export async function GET(
  request: NextRequest,
  { params }: { params: { domain: string } }
) {
  const domain = decodeURIComponent(params.domain);

  if (!domain) {
    return NextResponse.json({ error: 'Missing domain' }, { status: 400 });
  }

  try {
    // Query unified store_changes table (both product-scope and store-scope changes)
    const query = `
      SELECT
        change_id,
        change_date,
        change_type,
        change_category,
        COALESCE(change_description, '') as change_description,
        old_value,
        new_value,
        COALESCE(
          significance_score,
          CASE severity
            WHEN 'critical' THEN 1.0
            WHEN 'high' THEN 0.7
            WHEN 'medium' THEN 0.4
            ELSE 0.2
          END,
          0.5
        ) as severity_score,
        COALESCE(severity, 'low') as severity,
        change_scope as source_table
      FROM \`shopifydb.${DATASET}.store_changes\`
      WHERE domain = @domain
        AND change_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
      ORDER BY change_date DESC
      LIMIT 50
    `;

    const [rows] = await bigquery.query({ query, params: { domain } });

    return NextResponse.json({ changes: rows });
  } catch (error) {
    console.error('Store changes API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch store changes' },
      { status: 500 }
    );
  }
}
