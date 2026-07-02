import type { PrrCoeStatus } from '../types'

export function getCoeStatusBadgeStyle(status: PrrCoeStatus): string {
  const styles: Record<PrrCoeStatus, string> = {
    'Not Set': 'bg-gray-500/15 text-gray-300 border-gray-500/25',
    'Pending Evaluation': 'bg-amber-500/15 text-amber-400 border-amber-500/25',
    'Ready to Present': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    'Presented': 'bg-teal-500/15 text-teal-400 border-teal-500/25',
    'Needs Attention': 'bg-rose-500/15 text-rose-400 border-rose-500/25',
    'Not Applies': 'bg-slate-500/15 text-slate-300 border-slate-500/25',
    'Other': 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25',
    'Closed': 'bg-red-500/15 text-red-400 border-red-500/25',
  }
  return styles[status] ?? styles['Not Set']
}

export function getImpactBadgeStyle(impact: string): string {
  const value = impact.trim().toLowerCase()
  if (value.includes('high') || value.includes('critical')) return 'bg-red-500/15 text-red-400 border-red-500/25'
  if (value.includes('medium')) return 'bg-amber-500/15 text-amber-400 border-amber-500/25'
  if (value.includes('low')) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
  return 'bg-white/5 text-secondary border-white/10'
}

export function getRiskBadgeStyle(risk: string): string {
  const value = risk.trim().toLowerCase()
  if (value.includes('high') || value.includes('critical')) return 'bg-red-500/15 text-red-400 border-red-500/25'
  if (value.includes('medium')) return 'bg-amber-500/15 text-amber-400 border-amber-500/25'
  if (value.includes('low')) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
  return 'bg-white/5 text-secondary border-white/10'
}
