interface DataPoint {
  label: string;
  value: number;
}

interface SkillRadarProps {
  data: DataPoint[];
  maxValue?: number;
  comparison?: DataPoint[];
  size?: number;
}

function polarToCartesian(cx: number, cy: number, r: number, angleIndex: number, total: number) {
  const angle = (2 * Math.PI * angleIndex) / total - Math.PI / 2;
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

function buildPolygonPoints(cx: number, cy: number, values: number[], max: number, radius: number) {
  return values
    .map((v, i) => {
      const r = (v / max) * radius;
      const p = polarToCartesian(cx, cy, r, i, values.length);
      return `${p.x},${p.y}`;
    })
    .join(' ');
}

export default function SkillRadar({ data, maxValue = 100, comparison, size = 300 }: SkillRadarProps) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.38;
  const rings = [0.25, 0.5, 0.75, 1];
  const n = data.length;

  const gridLines = Array.from({ length: n }, (_, i) => {
    const p = polarToCartesian(cx, cy, radius, i, n);
    return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} className="stroke-gray-300 dark:stroke-white/15" strokeWidth={0.5} />;
  });

  const gridRings = rings.map((r, i) => {
    const pts = Array.from({ length: n }, (_, j) => {
      const p = polarToCartesian(cx, cy, radius * r, j, n);
      return `${p.x},${p.y}`;
    }).join(' ');
    return <polygon key={i} points={pts} fill="none" className="stroke-gray-200 dark:stroke-white/10" strokeWidth={0.5} />;
  });

  const labels = data.map((d, i) => {
    const p = polarToCartesian(cx, cy, radius + 24, i, n);
    return (
      <text
        key={d.label}
        x={p.x}
        y={p.y}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-gray-500 dark:fill-gray-400 text-[10px] font-medium uppercase"
      >
        {d.label}
      </text>
    );
  });

  const mainPoly = buildPolygonPoints(cx, cy, data.map((d) => d.value), maxValue, radius);
  const compPoly = comparison
    ? buildPolygonPoints(cx, cy, comparison.map((d) => d.value), maxValue, radius)
    : null;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {gridRings}
      {gridLines}
      {compPoly && (
        <polygon
          points={compPoly}
          fill="none"
          stroke="#62fae3"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          opacity={0.6}
        />
      )}
      <polygon
        points={mainPoly}
        fill="rgba(59,191,250,0.15)"
        stroke="#3bbffa"
        strokeWidth={2}
        className="dark:fill-[rgba(59,191,250,0.2)]"
      />
      {data.map((d, i) => {
        const r = (d.value / maxValue) * radius;
        const p = polarToCartesian(cx, cy, r, i, n);
        return <circle key={d.label} cx={p.x} cy={p.y} r={3} fill="#3bbffa" />;
      })}
      {labels}
    </svg>
  );
}
