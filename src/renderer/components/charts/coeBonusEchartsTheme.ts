// Shared ECharts theme for the C.O.E. Bonus report.
//
// Registers a light and a dark theme on the global echarts instance (the same
// instance `echarts-for-react` uses by default) so every chart in the report
// stays visually consistent with the app's glass/dark palette.

import * as echarts from 'echarts'

/** Brand-aligned series palette. */
export const COE_BONUS_PALETTE = [
  '#10b981', // emerald  — primary / on-track
  '#3b82f6', // blue     — secondary
  '#f59e0b', // amber    — at-risk / goal markers
  '#8b5cf6', // violet
  '#ef4444', // red      — missed
  '#06b6d4', // cyan
]

export const STATUS_COLORS = {
  'on-track': '#10b981',
  'at-risk': '#f59e0b',
  missed: '#ef4444',
} as const

export const COE_BONUS_DARK_THEME = 'coeBonusDark'
export const COE_BONUS_LIGHT_THEME = 'coeBonusLight'

function buildTheme(dark: boolean) {
  const text = dark ? '#cbd5e1' : '#475569'
  const subtleText = dark ? '#94a3b8' : '#64748b'
  const axisLine = dark ? 'rgba(148,163,184,0.25)' : 'rgba(100,116,139,0.25)'
  const splitLine = dark ? 'rgba(148,163,184,0.12)' : 'rgba(100,116,139,0.12)'
  const tooltipBg = dark ? 'rgba(28,28,38,0.95)' : 'rgba(255,255,255,0.97)'
  const tooltipBorder = dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'

  return {
    color: COE_BONUS_PALETTE,
    backgroundColor: 'transparent',
    textStyle: { color: text, fontFamily: 'inherit' },
    title: {
      textStyle: { color: dark ? '#f1f5f9' : '#0f172a', fontWeight: 600 },
      subtextStyle: { color: subtleText },
    },
    legend: { textStyle: { color: text } },
    tooltip: {
      backgroundColor: tooltipBg,
      borderColor: tooltipBorder,
      borderWidth: 1,
      textStyle: { color: dark ? '#e2e8f0' : '#1e293b', fontSize: 12 },
      extraCssText: 'backdrop-filter: blur(8px); border-radius: 10px; box-shadow: 0 8px 32px rgba(0,0,0,0.18);',
    },
    categoryAxis: {
      axisLine: { lineStyle: { color: axisLine } },
      axisTick: { show: false },
      axisLabel: { color: subtleText },
      splitLine: { show: false, lineStyle: { color: splitLine } },
    },
    valueAxis: {
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: subtleText },
      splitLine: { lineStyle: { color: splitLine } },
    },
  }
}

let registered = false

/** Register both themes once. Safe to call repeatedly. */
export function ensureCoeBonusThemes(): void {
  if (registered) return
  echarts.registerTheme(COE_BONUS_DARK_THEME, buildTheme(true))
  echarts.registerTheme(COE_BONUS_LIGHT_THEME, buildTheme(false))
  registered = true
}

export function isDarkMode(): boolean {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
}
