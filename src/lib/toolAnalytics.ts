export type ToolUsagePoint = {
  date: string;
  count: number;
};

export type ToolWinLoss = {
  domain: string;
  note: string;
};

export type ToolSwitch = {
  domain: string;
  from_tool: string;
  to_tool: string;
  change_date: string;
};

export type ToolAnalytics = {
  tool_id: string;
  tool_name?: string;
  usage: ToolUsagePoint[];
  wins: ToolWinLoss[];
  losses: ToolWinLoss[];
  switches: ToolSwitch[];
  data_source: 'mock' | 'bigquery';
  dataAvailable: boolean;
};

function hashSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || 1;
}

function seededRand(seed: number) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function monthLabels(count: number): string[] {
  const labels: string[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(d.toLocaleString('en-US', { month: 'short', year: '2-digit' }));
  }
  return labels;
}

export function buildMockToolAnalytics(toolId: string, toolName?: string): ToolAnalytics {
  const seed = hashSeed(toolId || toolName || 'tool');
  const rand = seededRand(seed);
  const usage = monthLabels(10).map((label, idx) => {
    const baseline = 40 + idx * 4;
    const variance = Math.round(rand() * 12);
    return { date: label, count: baseline + variance };
  });

  const wins = Array.from({ length: 3 }).map((_, idx) => ({
    domain: `brand-${Math.floor(rand() * 900 + 100)}.com`,
    note: idx === 0 ? 'Adopted for attribution layering' : idx === 1 ? 'Expanded to multi-store rollout' : 'Replaced a legacy suite',
  }));

  const losses = Array.from({ length: 3 }).map((_, idx) => ({
    domain: `shop-${Math.floor(rand() * 900 + 100)}.com`,
    note: idx === 0 ? 'Migrated to bundled suite' : idx === 1 ? 'Switched to in-house tooling' : 'Consolidated vendors',
  }));

  const switches = Array.from({ length: 4 }).map((_, idx) => ({
    domain: `store-${Math.floor(rand() * 900 + 100)}.com`,
    from_tool: idx % 2 === 0 ? 'Legacy Suite' : 'Tool A',
    to_tool: idx % 2 === 0 ? (toolName || 'Selected Tool') : 'Tool B',
    change_date: monthLabels(10)[Math.max(0, 9 - idx)],
  }));

  return {
    tool_id: toolId,
    tool_name: toolName,
    usage,
    wins,
    losses,
    switches,
    data_source: 'mock',
    dataAvailable: true,
  };
}
