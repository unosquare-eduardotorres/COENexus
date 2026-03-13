interface ScoreRingProps {
  score: number;
  size?: number;
}

const STROKE_WIDTH = 5;

function getStrokeColor(score: number): string {
  if (score >= 85) return '#059669';
  if (score >= 70) return '#f59e0b';
  return '#ef4444';
}

export default function ScoreRing({ score, size = 64 }: ScoreRingProps) {
  const radius = (size - STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const strokeColor = getStrokeColor(score);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={STROKE_WIDTH}
        className="text-gray-200 dark:text-gray-700"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={strokeColor}
        strokeWidth={STROKE_WIDTH}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="-rotate-90 origin-center [transition:stroke-dashoffset_0.6s_ease]"
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={size * 0.25}
        fill="currentColor"
        className="text-primary font-mono"
        fontFamily="monospace"
      >
        {score}
      </text>
    </svg>
  );
}
