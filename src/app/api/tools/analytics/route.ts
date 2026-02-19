import { NextRequest, NextResponse } from 'next/server';
import {
  getToolUsageTimeline,
  getToolWinsLosses,
  getToolSwitchEvents,
} from '@/lib/bigquery';
import type { ToolAnalytics } from '@/lib/toolAnalytics';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const toolId = searchParams.get('toolId');
  const toolName = searchParams.get('toolName') || undefined;

  if (!toolId) {
    return NextResponse.json({ error: 'Missing toolId' }, { status: 400 });
  }

  try {
    const [usage, winsLosses, switches] = await Promise.all([
      getToolUsageTimeline(toolId),
      getToolWinsLosses(toolId),
      getToolSwitchEvents(toolId),
    ]);

    const dataAvailable = usage.length > 0;

    // Flatten wins/losses into the format the UI expects
    const wins = winsLosses.flatMap((row) =>
      (row.win_domains || []).map((domain) => ({
        domain,
        note: `Added on ${row.change_date}`,
      }))
    ).slice(0, 10);

    const losses = winsLosses.flatMap((row) =>
      (row.loss_domains || []).map((domain) => ({
        domain,
        note: `Removed on ${row.change_date}`,
      }))
    ).slice(0, 10);

    const analytics: ToolAnalytics = {
      tool_id: toolId,
      tool_name: toolName,
      usage,
      wins,
      losses,
      switches,
      data_source: 'bigquery',
      dataAvailable,
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Tool analytics API error:', error);
    return NextResponse.json({ error: 'Failed to fetch tool analytics' }, { status: 500 });
  }
}
