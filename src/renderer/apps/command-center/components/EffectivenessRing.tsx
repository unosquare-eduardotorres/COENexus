interface EffectivenessRingProps {
  percent: number
  size?: 'sm' | 'lg'
}

export default function EffectivenessRing({ percent, size = 'sm' }: EffectivenessRingProps) {
  const dimension = size === 'lg' ? 120 : 64
  const strokeWidth = size === 'lg' ? 8 : 5
  const radius = (dimension - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percent / 100) * circumference

  const ringColor =
    percent < 40 ? 'stroke-red-500' :
    percent < 70 ? 'stroke-amber-500' :
    percent < 90 ? 'stroke-emerald-500' :
    'stroke-blue-500'

  const textColor =
    percent < 40 ? 'text-red-500' :
    percent < 70 ? 'text-amber-500' :
    percent < 90 ? 'text-emerald-500' :
    'text-blue-500'

  const fontSize = size === 'lg' ? 'text-2xl' : 'text-sm'

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: dimension, height: dimension }}>
      <svg width={dimension} height={dimension} className="-rotate-90">
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200 dark:text-dark-border"
        />
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${ringColor} transition-all duration-700 ease-out`}
        />
      </svg>
      <span className={`absolute ${fontSize} font-bold ${textColor}`}>
        {percent}%
      </span>
    </div>
  )
}
