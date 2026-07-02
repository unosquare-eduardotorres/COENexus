import { CRITERIA_CONFIG, type CriterionActor } from '../../types'

const COLUMN_FILTER_LABELS: Record<string, string> = {
  account: 'Account',
  status: 'Status',
  stakeholder: 'Stakeholder',
  coe: 'COE',
  practice: 'Practice',
  main_skill: 'Main Skill',
  vertical: 'Vertical',
  action_needed: 'Action Needed',
  criteria: 'Criteria',
  job_title: 'Job Title',
  countries: 'Countries',
  seniorities: 'Seniorities',
  sourcing: 'Sourcing',
}

interface FiltersPanelProps {
  criteriaFilter: string[]
  criteriaFilterCounts: Record<string, number>
  filterActors: CriterionActor[]
  columnFilters: Record<string, string[]>
  hasActiveFilters: boolean
  onCriteriaFilterChange: (filter: string[]) => void
  onActorsChange: (actors: CriterionActor[]) => void
  onClearAllFilters: () => void
  onClearColumnFilter: (key: string) => void
}

export default function FiltersPanel({
  criteriaFilter,
  criteriaFilterCounts,
  filterActors,
  columnFilters,
  hasActiveFilters,
  onCriteriaFilterChange,
  onActorsChange,
  onClearAllFilters,
  onClearColumnFilter,
}: FiltersPanelProps) {
  return (
    <div className="glass-panel-subtle rounded-xl p-3 space-y-3 relative z-10">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-primary uppercase tracking-wider">Criteria</p>
        {hasActiveFilters && (
          <button onClick={onClearAllFilters} className="text-xs text-red-400 hover:text-red-300 transition-colors">
            Clear all
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {CRITERIA_CONFIG.map(config => {
          const isActive = criteriaFilter.includes(config.key)
          const count = criteriaFilterCounts[config.key] ?? 0
          return (
            <button
              key={config.key}
              onClick={() => onCriteriaFilterChange(
                isActive
                  ? criteriaFilter.filter(k => k !== config.key)
                  : [...criteriaFilter, config.key]
              )}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                isActive ? config.colorClass : 'bg-white/5 text-muted border-white/5 hover:text-secondary'
              }`}
            >
              {config.label} ({count})
            </button>
          )
        })}
      </div>

      <div className="minimal-divider" />

      <div className="flex items-center gap-3 flex-wrap">
        <p className="text-xs font-medium text-primary uppercase tracking-wider shrink-0">Actors</p>
        <div className="flex items-center gap-1.5">
          {(['COE', 'CGX'] as CriterionActor[]).map(actor => {
            const isActive = filterActors.includes(actor)
            return (
              <button
                key={actor}
                onClick={() => onActorsChange(
                  isActive
                    ? filterActors.filter(a => a !== actor)
                    : [...filterActors, actor]
                )}
                className={`px-2.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border transition-all ${
                  isActive
                    ? actor === 'COE' ? 'bg-blue-500/15 text-blue-400 border-blue-500/25' : 'bg-purple-500/15 text-purple-400 border-purple-500/25'
                    : 'bg-white/5 text-muted border-white/5 hover:text-secondary'
                }`}
              >
                {actor}
              </button>
            )
          })}
        </div>
      </div>

      {Object.keys(columnFilters).length > 0 && (
        <>
          <div className="minimal-divider" />
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs font-medium text-primary uppercase tracking-wider shrink-0">Active Column Filters</p>
            {Object.entries(columnFilters).map(([key, values]) => (
              <span key={key} className="px-2 py-1 rounded-lg text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
                {COLUMN_FILTER_LABELS[key] ?? key}: {values.length} selected
                <button onClick={() => onClearColumnFilter(key)} className="hover:text-emerald-200 transition-colors">×</button>
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
