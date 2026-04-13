interface DataPoint {
  month: string;
  actual: number;
  projected: number;
}

interface PromotionVelocityChartProps {
  data: DataPoint[];
}

export default function PromotionVelocityChart({ data }: PromotionVelocityChartProps) {
  const maxVal = Math.max(...data.flatMap((d) => [d.actual, d.projected]), 1);
  const barWidth = 28;
  const gap = 12;
  const chartHeight = 200;
  const leftPad = 32;
  const bottomPad = 28;
  const totalWidth = leftPad + data.length * (barWidth + gap);

  return (
    <div>
      <div className="mb-3 flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
          <span className="text-xs text-secondary">Actual</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border-2 border-dashed border-cyan-400 bg-transparent" />
          <span className="text-xs text-secondary">Projected</span>
        </div>
      </div>
      <svg width={totalWidth} height={chartHeight + bottomPad} viewBox={`0 0 ${totalWidth} ${chartHeight + bottomPad}`} className="w-full">
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = chartHeight - frac * chartHeight;
          return (
            <g key={frac}>
              <line x1={leftPad} y1={y} x2={totalWidth} y2={y} className="stroke-gray-200 dark:stroke-white/10" strokeWidth={0.5} />
              <text x={leftPad - 4} y={y + 3} textAnchor="end" className="fill-gray-400 dark:fill-gray-500 text-[9px]">
                {Math.round(maxVal * frac)}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const x = leftPad + i * (barWidth + gap) + gap / 2;
          const actualH = (d.actual / maxVal) * chartHeight;
          const projH = (d.projected / maxVal) * chartHeight;
          const monthLabel = d.month.split('-')[1] || d.month;
          const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
          const label = months[parseInt(monthLabel, 10) - 1] || monthLabel;

          return (
            <g key={d.month}>
              <rect
                x={x}
                y={chartHeight - projH}
                width={barWidth}
                height={projH}
                rx={3}
                fill="none"
                className="stroke-cyan-400 dark:stroke-cyan-300"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                opacity={0.5}
              />
              <rect
                x={x}
                y={chartHeight - actualH}
                width={barWidth}
                height={actualH}
                rx={3}
                className="fill-blue-500 dark:fill-blue-400"
                opacity={0.85}
              />
              <text
                x={x + barWidth / 2}
                y={chartHeight + 16}
                textAnchor="middle"
                className="fill-gray-500 dark:fill-gray-400 text-[9px] font-medium"
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
