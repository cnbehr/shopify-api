interface SophisticationRadarProps {
  acquisition: number;
  retention: number;
  optimization: number;
  scale: number;
}

const AXES = [
  { label: 'Acquisition', max: 25, angle: -Math.PI / 2 },         // top
  { label: 'Retention', max: 30, angle: 0 },                       // right
  { label: 'Optimization', max: 25, angle: Math.PI / 2 },          // bottom
  { label: 'Scale', max: 20, angle: Math.PI },                     // left
];

const SIZE = 250;
const CENTER = SIZE / 2;
const RADIUS = 90;
const GRID_LEVELS = [0.25, 0.5, 0.75, 1.0];

function polarToCart(angle: number, r: number): [number, number] {
  return [CENTER + r * Math.cos(angle), CENTER + r * Math.sin(angle)];
}

export function SophisticationRadar({ acquisition, retention, optimization, scale }: SophisticationRadarProps) {
  const values = [acquisition, retention, optimization, scale];
  const totalScore = values.reduce((a, b) => a + b, 0);

  // Normalize each value to 0-1 range based on its axis max
  const normalized = values.map((v, i) => Math.min(v / AXES[i].max, 1));

  // Build the data polygon
  const dataPoints = AXES.map((axis, i) => polarToCart(axis.angle, normalized[i] * RADIUS));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ') + ' Z';

  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="mx-auto"
    >
      {/* Grid lines */}
      {GRID_LEVELS.map(level => {
        const pts = AXES.map(axis => polarToCart(axis.angle, level * RADIUS));
        const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ') + ' Z';
        return (
          <path
            key={level}
            d={path}
            fill="none"
            stroke="var(--muted)"
            strokeWidth="0.5"
            opacity="0.25"
          />
        );
      })}

      {/* Axis lines */}
      {AXES.map((axis, i) => {
        const [ex, ey] = polarToCart(axis.angle, RADIUS);
        return (
          <line
            key={i}
            x1={CENTER}
            y1={CENTER}
            x2={ex}
            y2={ey}
            stroke="var(--muted)"
            strokeWidth="0.5"
            opacity="0.3"
          />
        );
      })}

      {/* Data fill */}
      <path
        d={dataPath}
        fill="var(--accent)"
        fillOpacity="0.15"
        stroke="var(--accent)"
        strokeWidth="2"
      />

      {/* Data points */}
      {dataPoints.map((p, i) => (
        <circle
          key={i}
          cx={p[0]}
          cy={p[1]}
          r="3"
          fill="var(--accent)"
        />
      ))}

      {/* Axis labels */}
      {AXES.map((axis, i) => {
        const labelR = RADIUS + 22;
        const [lx, ly] = polarToCart(axis.angle, labelR);
        const raw = values[i];
        return (
          <text
            key={i}
            x={lx}
            y={ly}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="var(--muted)"
            fontSize="10"
            fontFamily="'Instrument Sans', sans-serif"
          >
            <tspan x={lx} dy="-0.5em">{axis.label}</tspan>
            <tspan x={lx} dy="1.2em" fontSize="9" opacity="0.7">{raw}/{axis.max}</tspan>
          </text>
        );
      })}

      {/* Center total */}
      <text
        x={CENTER}
        y={CENTER - 6}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="var(--ink-strong)"
        fontSize="20"
        fontWeight="700"
        fontFamily="'Space Grotesk', sans-serif"
      >
        {totalScore}
      </text>
      <text
        x={CENTER}
        y={CENTER + 12}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="var(--muted)"
        fontSize="9"
        fontFamily="'Instrument Sans', sans-serif"
      >
        / 100
      </text>
    </svg>
  );
}
