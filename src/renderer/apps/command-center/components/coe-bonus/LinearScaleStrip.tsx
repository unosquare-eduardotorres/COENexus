// Floor → target linear-scale strip with the achievement marker.
//
// Visualises the "5-point gap, linear scale" bonus mechanic: 0% attainment at
// the floor, 100% at the target. Pure SVG — no chart dependency. Phase 1 only
// VISUALISES the scale; it does not compute authoritative bonus values.

interface LinearScaleStripProps {
  floor: number
  target: number
  achievement: number
  /** Visual padding (percentage points) shown beyond floor/target. */
  pad?: number
  unit?: string
  height?: number
}

export default function LinearScaleStrip({
  floor,
  target,
  achievement,
  pad = 2,
  unit = '%',
  height = 88,
}: LinearScaleStripProps) {
  const axisMin = floor - pad
  const axisMax = target + pad
  const span = axisMax - axisMin

  const toPct = (v: number) => ((v - axisMin) / span) * 100
  const clampPct = (p: number) => Math.max(0, Math.min(100, p))

  const floorPct = clampPct(toPct(floor))
  const targetPct = clampPct(toPct(target))
  const achPct = clampPct(toPct(achievement))

  const attainment = Math.max(0, Math.min(1, (achievement - floor) / (target - floor)))
  const markerColor = attainment >= 1 ? '#10b981' : attainment > 0 ? '#f59e0b' : '#ef4444'

  return (
    <div className="w-full" style={{ height }}>
      <div className="relative w-full" style={{ paddingTop: 18, paddingBottom: 24 }}>
        {/* Track */}
        <div className="relative h-3 rounded-full bg-gray-200/70 dark:bg-white/5 overflow-hidden">
          {/* Active 5-point window */}
          <div
            className="absolute top-0 bottom-0 bg-gradient-to-r from-red-400/40 via-amber-400/50 to-emerald-400/60"
            style={{ left: `${floorPct}%`, width: `${Math.max(0, targetPct - floorPct)}%` }}
          />
          {/* Earned fill up to achievement */}
          <div
            className="absolute top-0 bottom-0 rounded-r-full"
            style={{
              left: `${floorPct}%`,
              width: `${Math.max(0, achPct - floorPct)}%`,
              backgroundColor: markerColor,
              opacity: 0.85,
            }}
          />
        </div>

        {/* Floor marker */}
        <div className="absolute" style={{ left: `${floorPct}%`, top: 0, transform: 'translateX(-50%)' }}>
          <div className="text-[10px] font-medium text-muted whitespace-nowrap">Floor {floor}{unit}</div>
          <div className="mx-auto h-3 w-px bg-gray-400/50 dark:bg-white/20" />
        </div>

        {/* Target marker */}
        <div className="absolute" style={{ left: `${targetPct}%`, top: 0, transform: 'translateX(-50%)' }}>
          <div className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
            Target {target}{unit}
          </div>
          <div className="mx-auto h-3 w-px bg-emerald-500/60" />
        </div>

        {/* Achievement marker */}
        <div
          className="absolute"
          style={{ left: `${achPct}%`, bottom: 0, transform: 'translateX(-50%)' }}
        >
          <div
            className="mx-auto h-3 w-0.5"
            style={{ backgroundColor: markerColor }}
          />
          <div
            className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-white whitespace-nowrap"
            style={{ backgroundColor: markerColor }}
          >
            {achievement}{unit} · {Math.round(attainment * 100)}%
          </div>
        </div>
      </div>
    </div>
  )
}
