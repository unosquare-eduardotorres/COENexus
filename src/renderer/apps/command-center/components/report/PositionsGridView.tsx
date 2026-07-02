import { CRITERIA_CONFIG, type StalledPositionResult } from '../../types'

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

function getAgingColor(aging: number): string {
  if (aging >= 45) return 'border-l-red-500'
  if (aging >= 21) return 'border-l-amber-500'
  if (aging >= 7) return 'border-l-yellow-500'
  return 'border-l-emerald-500'
}

interface PositionsGridViewProps {
  flaggedResults: StalledPositionResult[]
  healthyResults: StalledPositionResult[]
  filteredResults: StalledPositionResult[]
  filterHealthStatus: string
  columnFilters: Record<string, string[]>
  onSelectPosition: (upstreamId: number) => void
  onClearColumnFilter: (key: string) => void
}

export default function PositionsGridView({
  flaggedResults,
  healthyResults,
  filteredResults,
  filterHealthStatus,
  columnFilters,
  onSelectPosition,
  onClearColumnFilter,
}: PositionsGridViewProps) {
  return (
    <div className="space-y-4">
      {Object.keys(columnFilters).length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[11px] text-muted uppercase tracking-wider font-medium">Column Filters:</span>
          {Object.entries(columnFilters).map(([key, values]) => (
            <span key={key} className="px-2 py-1 rounded-lg text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
              {COLUMN_FILTER_LABELS[key] ?? key}: {values.length} selected
              <button onClick={() => onClearColumnFilter(key)} className="hover:text-emerald-200 transition-colors ml-0.5">×</button>
            </span>
          ))}
          <button
            onClick={() => {
              for (const key of Object.keys(columnFilters)) {
                onClearColumnFilter(key)
              }
            }}
            className="text-[10px] text-red-400 hover:text-red-300 ml-1 transition-colors"
          >
            Clear all
          </button>
        </div>
      )}

      {flaggedResults.length > 0 && (
        <>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            Flagged Positions ({flaggedResults.length})
          </p>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {flaggedResults.map(r => (
              <button
                key={r.position.upstream_id}
                onClick={() => onSelectPosition(r.position.upstream_id)}
                className={`glass-card-hover p-3 text-left transition-all border-l-[3px] ${getAgingColor(r.position.aging)}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-primary truncate">{r.position.account}</p>
                    <p className="text-xs text-muted truncate">{r.position.main_skill} · {r.position.stakeholder}</p>
                  </div>
                  <span className="shrink-0 text-sm font-mono font-bold text-primary px-1.5 py-0.5 rounded bg-white/5">
                    {r.position.aging}d
                  </span>
                </div>
                <div className="flex items-center gap-1 mb-2">
                  <span className="text-xs text-muted font-mono">#{r.position.upstream_id}</span>
                  <span className="text-xs text-muted">·</span>
                  <span className="text-xs text-muted">{r.position.coe}</span>
                  <span className="text-xs text-muted">·</span>
                  <span className="text-xs text-muted">{r.position.practice}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {r.matchingCriteria.map(key => {
                    const config = CRITERIA_CONFIG.find(c => c.key === key)
                    if (!config) return null
                    return (
                      <span key={key} className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium border ${config.colorClass}`}>
                        {config.label}
                      </span>
                    )
                  })}
                  {r.actors.map(actor => (
                    <span key={actor} className={`px-1.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                      actor === 'COE'
                        ? 'bg-blue-500/15 text-blue-400 border-blue-500/25'
                        : 'bg-purple-500/15 text-purple-400 border-purple-500/25'
                    }`}>
                      {actor}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {healthyResults.length > 0 && filterHealthStatus !== 'flagged' && (
        <>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted mt-4">
            Healthy Positions ({healthyResults.length})
          </p>
          <div className="grid gap-1.5 md:grid-cols-2 lg:grid-cols-3">
            {healthyResults.map(r => (
              <button
                key={r.position.upstream_id}
                onClick={() => onSelectPosition(r.position.upstream_id)}
                className="glass-card-hover p-2.5 text-left transition-all border-l-[3px] border-l-emerald-500 opacity-75 hover:opacity-100"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                      Healthy
                    </span>
                    <p className="text-sm font-medium text-primary truncate">{r.position.account}</p>
                    <span className="text-xs text-muted">·</span>
                    <span className="text-xs text-muted truncate">{r.position.main_skill}</span>
                  </div>
                  <span className="shrink-0 text-xs font-mono text-muted">{r.position.aging}d</span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {filteredResults.length === 0 && (
        <div className="glass-panel p-8 text-center text-sm text-muted">
          No positions match the selected filters.
        </div>
      )}
    </div>
  )
}
