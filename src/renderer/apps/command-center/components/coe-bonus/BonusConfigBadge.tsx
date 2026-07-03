// Clickable badge showing the active period. Navigates to Overview on click.

import { useNavigate } from 'react-router-dom'
import { useBonusConfig } from '../../contexts/BonusConfigContext'

export default function BonusConfigBadge() {
  const { activePeriod } = useBonusConfig()
  const navigate = useNavigate()

  return (
    <button
      type="button"
      onClick={() => navigate('/command-center/coe-bonus')}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg glass-panel-subtle hover:bg-white/10 transition-colors text-sm text-secondary hover:text-primary"
    >
      <span className="font-medium">
        {activePeriod.quarter} {activePeriod.year}
      </span>
      <span className="text-muted">·</span>
      <span className="text-slate-300">{activePeriod.coeName}</span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-slate-500"
      >
        <path d="m9 18 6-6-6-6" />
      </svg>
    </button>
  )
}
