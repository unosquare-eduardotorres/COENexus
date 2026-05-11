import type { ReactNode } from 'react'
import { createElement } from 'react'

export function parseJsonArray(json: string): string[] {
  try {
    const parsed = JSON.parse(json)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function formatRate(rate: number | null): string {
  if (rate === null || rate === undefined) return '—'
  return `${rate.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export function formatPercent(value: number | null): string {
  if (value === null || value === undefined) return '—'
  return `${Math.round(value * 100)}%`
}

export function formatDays(value: number | null): string {
  if (value === null || value === undefined) return '—'
  const rounded = Math.round(value)
  return `${rounded}d`
}

export function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return value.toLocaleString()
}

export function confidenceBadge(score: number): string {
  if (score >= 0.8) return 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300'
  if (score >= 0.5) return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
  return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
}

export function confidenceTooltip(score: number): string {
  if (score >= 0.8) return 'High confidence — 15+ data points with good data completeness'
  if (score >= 0.5) return 'Moderate confidence — 6–14 data points'
  return 'Low confidence — fewer than 6 data points'
}

export function confidenceColor(score: number): string {
  if (score >= 0.8) return 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300'
  if (score >= 0.5) return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
  return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
}

export function approvalBadgeSmall(status: string): ReactNode {
  switch (status) {
    case 'approved':
      return createElement('span', { className: 'px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' }, 'Approved')
    case 'auto_applied':
      return createElement('span', { className: 'px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300' }, 'Auto-applied')
    case 'rejected':
      return createElement('span', { className: 'px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300' }, 'Rejected')
    default:
      return createElement('span', { className: 'px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' }, 'Pending')
  }
}
