interface CandidateScores {
  technical: number;
  domain: number;
  leadership: number;
  softSkills: number;
  availability: number;
}

interface RadarChartCandidate {
  name: string;
  scores: CandidateScores;
}

interface RadarChartProps {
  candidates: RadarChartCandidate[];
  size?: number;
}

const CATEGORIES = ['Technical', 'Domain', 'Leadership', 'Soft Skills', 'Availability'] as const;
const SCORE_KEYS: (keyof CandidateScores)[] = ['technical', 'domain', 'leadership', 'softSkills', 'availability'];
const COLORS = ['#0d9488', '#6366f1', '#f59e0b'];
const GRID_LEVELS = [0.2, 0.4, 0.6, 0.8, 1.0];
const AXIS_COUNT = 5;

export default function RadarChart({ candidates, size = 300 }: RadarChartProps) {
  const center = size / 2;
  const radius = size * 0.35;
  const labelRadius = radius + size * 0.1;

  function getPoint(axisIndex: number, ratio: number) {
    const angle = (axisIndex * 2 * Math.PI) / AXIS_COUNT - Math.PI / 2;
    return {
      x: center + radius * ratio * Math.cos(angle),
      y: center + radius * ratio * Math.sin(angle),
    };
  }

  function getLabelPosition(axisIndex: number) {
    const angle = (axisIndex * 2 * Math.PI) / AXIS_COUNT - Math.PI / 2;
    return {
      x: center + labelRadius * Math.cos(angle),
      y: center + labelRadius * Math.sin(angle),
    };
  }

  function buildPolygonPoints(ratios: number[]) {
    return ratios
      .map((ratio, i) => {
        const pt = getPoint(i, ratio);
        return `${pt.x},${pt.y}`;
      })
      .join(' ');
  }

  function buildGridPolygonPoints(level: number) {
    return Array.from({ length: AXIS_COUNT }, (_, i) => {
      const pt = getPoint(i, level);
      return `${pt.x},${pt.y}`;
    }).join(' ');
  }

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      {GRID_LEVELS.map((level) => (
        <polygon
          key={level}
          points={buildGridPolygonPoints(level)}
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
          className="text-gray-300 dark:text-gray-600"
          strokeOpacity="0.6"
        />
      ))}

      {Array.from({ length: AXIS_COUNT }, (_, i) => {
        const end = getPoint(i, 1);
        return (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={end.x}
            y2={end.y}
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-gray-300 dark:text-gray-600"
            strokeOpacity="0.6"
          />
        );
      })}

      {candidates.map((candidate, ci) => {
        const ratios = SCORE_KEYS.map((key) => candidate.scores[key] / 100);
        const color = COLORS[ci % COLORS.length];
        return (
          <polygon
            key={candidate.name}
            points={buildPolygonPoints(ratios)}
            fill={color}
            fillOpacity="0.25"
            stroke={color}
            strokeWidth="2"
            strokeOpacity="1"
          />
        );
      })}

      {CATEGORIES.map((label, i) => {
        const pos = getLabelPosition(i);
        return (
          <text
            key={label}
            x={pos.x}
            y={pos.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={size * 0.042}
            fill="currentColor"
            className="text-secondary"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}
