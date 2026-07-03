import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import EChart from '../../../../components/charts/EChart'
import { STATUS_COLORS } from '../../../../components/charts/coeBonusEchartsTheme'
import type { MeasureStatus } from '../../types/coeBonus'

interface MeasureGaugeProps {
  /** Achieved value (percent). */
  value: number
  /** Target / goal value (percent) — drawn as an amber band on the arc. */
  goal: number
  /** Lower bound of the gauge axis. */
  min?: number
  /** Upper bound of the gauge axis. */
  max?: number
  status: MeasureStatus
  label?: string
  height?: number
}

export default function MeasureGauge({
  value,
  goal,
  min = 0,
  max = 100,
  status,
  label,
  height = 220,
}: MeasureGaugeProps) {
  const color = STATUS_COLORS[status]

  const option = useMemo<EChartsOption>(() => {
    const goalRatio = Math.max(0, Math.min(1, (goal - min) / (max - min)))
    const bandHalf = 0.006
    return {
      series: [
        // Track + achievement progress arc.
        {
          type: 'gauge',
          min,
          max,
          startAngle: 210,
          endAngle: -30,
          radius: '94%',
          center: ['50%', '60%'],
          progress: {
            show: true,
            width: 14,
            roundCap: true,
            itemStyle: { color },
          },
          pointer: { show: false },
          axisLine: { lineStyle: { width: 14, color: [[1, 'rgba(148,163,184,0.18)']] } },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          anchor: { show: false },
          title: { offsetCenter: [0, '34%'], fontSize: 12, color: 'inherit' },
          detail: {
            valueAnimation: true,
            offsetCenter: [0, '4%'],
            fontSize: 30,
            fontWeight: 700,
            formatter: (v: number) => `${v.toFixed(1)}%`,
            color: 'inherit',
          },
          data: [{ value, name: label ?? '' }],
        },
        // Thin amber band marking the goal position on the same arc.
        {
          type: 'gauge',
          min,
          max,
          startAngle: 210,
          endAngle: -30,
          radius: '94%',
          center: ['50%', '60%'],
          progress: { show: false },
          pointer: { show: false },
          axisLine: {
            lineStyle: {
              width: 14,
              color: [
                [Math.max(0, goalRatio - bandHalf), 'transparent'],
                [Math.min(1, goalRatio + bandHalf), '#f59e0b'],
                [1, 'transparent'],
              ],
            },
          },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          detail: { show: false },
          data: [],
        },
      ],
    }
  }, [value, goal, min, max, color, label])

  return <EChart option={option} height={height} />
}
