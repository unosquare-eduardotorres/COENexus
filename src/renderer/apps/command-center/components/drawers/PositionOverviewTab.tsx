import { formatDate } from '../../utils/dateFormatters'

interface Skill {
  name: string
}

interface PositionOverviewTabProps {
  position: {
    upstream_id: number
    job_title: string
    coe: string
    practice: string
    stakeholder: string
    csu: string | null
    cs: string | null
    countries: string | null
    sourcing: string | null
    vertical_industry: string | null
    created: string | null
    ready_date: string | null
    last_modification: string | null
    aging: number
  }
  additionalSkills: Skill[]
  rateRange: string
}

export default function PositionOverviewTab({ position, additionalSkills, rateRange }: PositionOverviewTabProps) {
  const fields = [
    { label: 'Job Title', value: position.job_title || '—' },
    { label: 'COE', value: position.coe },
    { label: 'Practice', value: position.practice },
    { label: 'Stakeholder', value: position.stakeholder },
    { label: 'CSU / CS', value: `${position.csu || '—'} / ${position.cs || '—'}` },
    { label: 'Countries', value: position.countries || '—' },
    { label: 'Rate Range', value: rateRange },
    { label: 'Sourcing', value: position.sourcing || '—' },
    { label: 'Vertical', value: position.vertical_industry || '—' },
  ]

  const dates = [
    { label: 'Created', value: formatDate(position.created), highlight: false },
    { label: 'Ready Date', value: formatDate(position.ready_date), highlight: false },
    { label: 'Last Modified', value: formatDate(position.last_modification), highlight: false },
    { label: 'Aging', value: `${position.aging} days`, highlight: true },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {fields.map(row => (
          <div key={row.label}>
            <p className="text-xs text-muted uppercase tracking-wide mb-0.5">{row.label}</p>
            <p className="text-sm text-primary">{row.value}</p>
          </div>
        ))}
        <div>
          <p className="text-xs text-muted uppercase tracking-wide mb-1.5">SharePoint</p>
          <button
            onClick={() => window.api.app.openExternal(
              `https://unosquare.sharepoint.com/sites/CoE-Core/SitePages/Open-Positions.aspx?OpenPositionId=${position.upstream_id}`
            )}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Open in SharePoint
          </button>
        </div>
      </div>

      <div className="glass-panel-subtle p-4 flex items-center justify-between">
        {dates.map((d, i, arr) => (
          <div key={d.label} className="flex items-center gap-0">
            <div className="text-center">
              <p className="text-xs text-muted uppercase tracking-wide mb-0.5">{d.label}</p>
              <p className={`text-sm font-mono ${d.highlight ? 'text-emerald-400 font-bold' : 'text-primary'}`}>{d.value}</p>
            </div>
            {i < arr.length - 1 && <div className="w-px h-8 bg-white/10 mx-4" />}
          </div>
        ))}
      </div>

      {additionalSkills.length > 0 && (
        <div>
          <p className="text-xs text-muted uppercase tracking-wide mb-2">Additional Skills</p>
          <div className="flex flex-wrap gap-1.5">
            {additionalSkills.map((s, i) => (
              <span key={i} className="px-2 py-1 rounded-md bg-white/5 text-xs text-secondary border border-white/5">{s.name}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
