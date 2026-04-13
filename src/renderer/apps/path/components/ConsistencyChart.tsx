interface ConsistencyChartProps {
  data: { month: string; value: number }[];
  avgVelocity?: string;
}

export default function ConsistencyChart({ data, avgVelocity }: ConsistencyChartProps) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const barWidth = 32;
  const gap = 10;
  const chartHeight = 120;
  const leftPad = 24;
  const bottomPad = 24;
  const totalWidth = leftPad + data.length * (barWidth + gap);
  const avgLine = avgVelocity ? parseFloat(avgVelocity) : null;

  return (
    <div>
      {avgVelocity && (
        <p className="mb-2 text-xs text-secondary">Avg. velocity: <span className="font-semibold text-primary">{avgVelocity}</span></p>
      )}
      <svg width={totalWidth} height={chartHeight + bottomPad} viewBox={`0 0 ${totalWidth} ${chartHeight + bottomPad}`} className="w-full">
        {avgLine !== null && !isNaN(avgLine) && (
          <line
            x1={leftPad}
            y1={chartHeight - (avgLine / maxVal) * chartHeight}
            x2={totalWidth}
            y2={chartHeight - (avgLine / maxVal) * chartHeight}
            className="stroke-violet-500 dark:stroke-violet-400"
            strokeWidth={1}
            strokeDasharray="4 2"
          />
        )}
        {data.map((d, i) => {
          const x = leftPad + i * (barWidth + gap) + gap / 2;
          const h = (d.value / maxVal) * chartHeight;
          return (
            <g key={d.month}>
              <rect
                x={x}
                y={chartHeight - h}
                width={barWidth}
                height={h}
                rx={3}
                className="fill-violet-500/70 dark:fill-violet-400/60"
              />
              <text
                x={x + barWidth / 2}
                y={chartHeight + 14}
                textAnchor="middle"
                className="fill-gray-500 dark:fill-gray-400 text-[9px]"
              >
                {d.month}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
