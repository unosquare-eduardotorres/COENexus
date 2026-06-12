// Reusable ECharts wrapper for the C.O.E. Bonus report.
//
// One place owns theming + rendering options so every chart across the report
// stays consistent. Picks the light/dark theme from the app's `dark` class and
// re-renders when the user toggles theme.

import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import {
  COE_BONUS_DARK_THEME,
  COE_BONUS_LIGHT_THEME,
  ensureCoeBonusThemes,
  isDarkMode,
} from './coeBonusEchartsTheme'

ensureCoeBonusThemes()

interface EChartProps {
  option: EChartsOption
  /** CSS height — number (px) or any CSS length. Defaults to 300px. */
  height?: number | string
  className?: string
  style?: CSSProperties
}

/** Tracks the app's dark-mode class so charts re-theme on toggle. */
function useIsDark(): boolean {
  const [dark, setDark] = useState(isDarkMode)
  useEffect(() => {
    const observer = new MutationObserver(() => setDark(isDarkMode()))
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    return () => observer.disconnect()
  }, [])
  return dark
}

export default function EChart({ option, height = 300, className, style }: EChartProps) {
  const dark = useIsDark()
  const resolvedHeight = typeof height === 'number' ? `${height}px` : height

  return (
    <ReactECharts
      key={dark ? 'dark' : 'light'}
      theme={dark ? COE_BONUS_DARK_THEME : COE_BONUS_LIGHT_THEME}
      option={option}
      notMerge
      lazyUpdate
      opts={{ renderer: 'svg' }}
      style={{ height: resolvedHeight, width: '100%', ...style }}
      className={className}
    />
  )
}
