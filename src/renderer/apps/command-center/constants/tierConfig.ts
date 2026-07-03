import { AlertTriangle, UserPlus, TrendingUp, ShieldCheck, CheckCircle2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { HealthTier } from '../types'

export interface TierConfig {
  key: HealthTier
  label: string
  shortLabel: string
  Icon: LucideIcon
  color: string
  bgColor: string
  borderColor: string
  borderLeft: string
  rowTint: string
  description: string
}

export const TIER_CONFIG: Record<HealthTier, TierConfig> = {
  critical: {
    key: 'critical',
    label: 'Needs Candidates',
    shortLabel: 'No Candidates',
    Icon: AlertTriangle,
    color: 'text-red-500',
    bgColor: 'bg-red-500/15',
    borderColor: 'border-red-500/25',
    borderLeft: 'border-l-red-500',
    rowTint: 'bg-red-500/[0.03]',
    description: 'No active candidates — immediate sourcing needed',
  },
  warning: {
    key: 'warning',
    label: 'Needs More Candidates',
    shortLabel: 'Needs More',
    Icon: UserPlus,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/15',
    borderColor: 'border-amber-500/25',
    borderLeft: 'border-l-amber-500',
    rowTint: '',
    description: 'Only 1 active candidate — backup needed',
  },
  good: {
    key: 'good',
    label: 'On Track',
    shortLabel: 'On Track',
    Icon: TrendingUp,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/15',
    borderColor: 'border-emerald-500/25',
    borderLeft: 'border-l-emerald-500',
    rowTint: '',
    description: '2 active candidates — solid coverage',
  },
  excellent: {
    key: 'excellent',
    label: 'Strong Pipeline',
    shortLabel: 'Strong',
    Icon: ShieldCheck,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/15',
    borderColor: 'border-blue-500/25',
    borderLeft: 'border-l-blue-500',
    rowTint: '',
    description: '3+ active candidates — excellent coverage',
  },
  won: {
    key: 'won',
    label: 'Filled',
    shortLabel: 'Filled',
    Icon: CheckCircle2,
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/15',
    borderColor: 'border-violet-500/25',
    borderLeft: 'border-l-violet-500',
    rowTint: 'bg-violet-500/[0.03]',
    description: 'Approved candidate — staffing complete',
  },
}

export const TIER_ORDER: HealthTier[] = ['critical', 'warning', 'good', 'excellent', 'won']
