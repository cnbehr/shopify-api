interface TrendSparklineProps {
  data: number[];
  direction: 'up' | 'down' | 'flat';
  width?: number;
  height?: number;
}

const COLORS: Record<string, string> = {
  up: 'var(--success)',
  down: 'var(--danger)',
  flat: 'var(--muted)',
};

export function TrendSparkline({ data, direction, width = 60, height = 20 }: TrendSparklineProps) {
  if (!data || data.length < 2) return null;

  const color = COLORS[direction];
  const gradientId = `spark-${direction}-${data.length}`;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const padding = 2;
  const chartW = width - padding * 2;
  const chartH = height - padding * 2;

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * chartW;
    const y = padding + chartH - ((v - min) / range) * chartH;
    return `${x},${y}`;
  });

  const polyline = points.join(' ');

  // Fill polygon: close the path along the bottom
  const fillPath =
    `M${padding},${padding + chartH} ` +
    data
      .map((v, i) => {
        const x = padding + (i / (data.length - 1)) * chartW;
        const y = padding + chartH - ((v - min) / range) * chartH;
        return `L${x},${y}`;
      })
      .join(' ') +
    ` L${padding + chartW},${padding + chartH} Z`;

  const arrowSize = 4;
  const arrowX = width + 4;
  const arrowY = height / 2;

  return (
    <span className="inline-flex items-center gap-1 flex-shrink-0">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={fillPath} fill={`url(#${gradientId})`} />
        <polyline
          points={polyline}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <svg width={arrowSize * 2} height={arrowSize * 2} viewBox={`0 0 ${arrowSize * 2} ${arrowSize * 2}`}>
        {direction === 'up' && (
          <path
            d={`M${arrowSize},1 L${arrowSize * 2 - 1},${arrowSize * 2 - 1} L1,${arrowSize * 2 - 1} Z`}
            fill={color}
          />
        )}
        {direction === 'down' && (
          <path
            d={`M1,1 L${arrowSize * 2 - 1},1 L${arrowSize},${arrowSize * 2 - 1} Z`}
            fill={color}
          />
        )}
        {direction === 'flat' && (
          <rect x="1" y={arrowSize - 1} width={arrowSize * 2 - 2} height="2" rx="1" fill={color} />
        )}
      </svg>
    </span>
  );
}
