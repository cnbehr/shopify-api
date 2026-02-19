import { NextRequest, NextResponse } from 'next/server';
import { BigQuery } from '@google-cloud/bigquery';

const bigquery = new BigQuery({ projectId: 'shopifydb' });
const DATASET = 'shopify_intelligence';

export async function GET(
  request: NextRequest,
  { params }: { params: { toolId: string } }
) {
  const toolId = decodeURIComponent(params.toolId);

  if (!toolId) {
    return NextResponse.json({ error: 'Missing toolId' }, { status: 400 });
  }

  try {
    // Get the tool name from unified detections table
    const nameQuery = `
      SELECT DISTINCT entity_name as tool_name FROM \`shopifydb.${DATASET}.detections\`
      WHERE entity_id = @toolId LIMIT 1
    `;
    const [nameRows] = await bigquery.query({ query: nameQuery, params: { toolId } });
    const toolName = (nameRows[0] as any)?.tool_name;

    if (!toolName) {
      return NextResponse.json({ error: 'Tool not found', adds: [], removes: [] }, { status: 404 });
    }

    const query = `
      SELECT
        domain,
        change_date,
        change_type,
        entity_name,
        change_description
      FROM \`shopifydb.${DATASET}.store_changes\`
      WHERE change_type IN ('tool_added', 'tool_removed', 'app_added', 'app_removed', 'pixel_added', 'pixel_removed')
        AND (entity_name = @toolName OR entity_id = @toolId)
        AND change_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
      ORDER BY change_date DESC
      LIMIT 50
    `;

    const [rows] = await bigquery.query({ query, params: { toolName, toolId } });

    const adds = (rows as any[])
      .filter(r => r.change_type.endsWith('_added'))
      .map(r => ({ domain: r.domain, date: r.change_date, description: r.change_description }));

    const removes = (rows as any[])
      .filter(r => r.change_type.endsWith('_removed'))
      .map(r => ({ domain: r.domain, date: r.change_date, description: r.change_description }));

    return NextResponse.json({ adds, removes, tool_name: toolName });
  } catch (error) {
    console.error('Tool changes API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tool changes' },
      { status: 500 }
    );
  }
}
