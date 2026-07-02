import { useMemo } from 'react'
import { formatDate } from '../../utils/dateFormatters'

interface PositionDetailsPanelProps {
  position: {
    upstream_id: number
    job_title: string
    account: string
    stakeholder: string
    main_skill: string
    additional_skills: string
    created: string | null
    ready_date: string | null
    last_modification: string | null
    aging: number
    coe: string
    practice: string
    countries: string | null
    seniorities: string | null
    minimum_rate: number | null
    maximum_rate: number | null
    sourcing: string | null
    vertical_industry: string | null
    csu: string | null
    cs: string | null
  }
}

export default function PositionDetailsPanel({ position: p }: PositionDetailsPanelProps) {
  const additionalSkills = useMemo(() => {
    if (!p.additional_skills) return []
    try {
      const parsed = JSON.parse(p.additional_skills) as Array<Record<string, unknown>>
      return parsed.map(s => ((s.label ?? s.tagName ?? s.name ?? '') as string)).filter(Boolean)
    } catch { return [] }
  }, [p.additional_skills])

  const rateRange = (p.minimum_rate != null || p.maximum_rate != null)
    ? `$${p.minimum_rate ?? 0} – $${p.maximum_rate ?? 0}`
    : '—'

  return (
    <div className="glass-panel p-5 space-y-5">
      <h2 className="text-sm font-semibold text-primary uppercase tracking-wide">Position Details</h2>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Job Title', value: p.job_title || '—' },
          { label: 'Account / Stakeholder', value: `${p.account || '—'} · ${p.stakeholder || '—'}` },
          { label: 'Main Skill', value: p.main_skill || '—' },
        ].map(row => (
          <div key={row.label}>
            <p className="text-[10px] text-muted uppercase tracking-wide mb-1">{row.label}</p>
            <p className="text-sm font-medium text-primary">{row.value}</p>
          </div>
        ))}
      </div>

      <div className="glass-panel-subtle p-4 flex items-center justify-between">
        {[
          { label: 'Created', value: formatDate(p.created), highlight: false },
          { label: 'Ready Date', value: formatDate(p.ready_date), highlight: false },
          { label: 'Last Modified', value: formatDate(p.last_modification), highlight: false },
          { label: 'Aging', value: `${p.aging} days`, highlight: true },
        ].map((d, i, arr) => (
          <div key={d.label} className="flex items-center gap-0">
            <div className="text-center">
              <p className="text-xs text-muted uppercase tracking-wide mb-0.5">{d.label}</p>
              <p className={`text-sm font-mono ${d.highlight ? 'text-emerald-400 font-bold' : 'text-primary'}`}>{d.value}</p>
            </div>
            {i < arr.length - 1 && <div className="w-px h-8 bg-white/10 mx-4" />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'COE', value: p.coe },
          { label: 'Practice', value: p.practice },
          { label: 'Countries', value: p.countries || '—' },
          { label: 'Seniority', value: p.seniorities || '—' },
          { label: 'Rate Range', value: rateRange },
          { label: 'Sourcing', value: p.sourcing || '—' },
          { label: 'Vertical', value: p.vertical_industry || '—' },
          { label: 'CSU / CS', value: `${p.csu || '—'} / ${p.cs || '—'}` },
        ].map(row => (
          <div key={row.label}>
            <p className="text-[9px] text-muted uppercase tracking-wide mb-0.5">{row.label}</p>
            <p className="text-xs text-secondary">{row.value}</p>
          </div>
        ))}
      </div>

      {additionalSkills.length > 0 && (
        <div>
          <p className="text-xs text-muted uppercase tracking-wide mb-2">Additional Skills</p>
          <div className="flex flex-wrap gap-1.5">
            {additionalSkills.map((name, i) => (
              <span key={i} className="px-2 py-1 rounded-md bg-white/5 text-xs text-secondary border border-white/5">{name}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
