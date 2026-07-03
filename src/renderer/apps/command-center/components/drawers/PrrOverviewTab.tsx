import { formatDate } from '../../utils/dateFormatters'
import { getCoeStatusBadgeStyle, getImpactBadgeStyle, getRiskBadgeStyle } from '../../utils/badgeStyles'
import type { PrrCoeStatus, PrrReportItem } from '../../types'
import { PRR_COE_STATUSES } from '../../types'

interface PrrOverviewTabProps {
  prr: PrrReportItem
  onStatusChange: (status: PrrCoeStatus) => void
  updatingStatus: boolean
}

export default function PrrOverviewTab({ prr, onStatusChange, updatingStatus }: PrrOverviewTabProps) {
  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Employee', value: prr.employee || '—' },
          { label: 'Client', value: prr.account || '—' },
          { label: 'Team', value: prr.team || '—' },
          { label: 'Main Skill', value: prr.mainSkill || '—' },
          { label: 'Seniority', value: prr.seniority || '—' },
          { label: 'PRR Status', value: prr.transitionStatus || '—' },
        ].map(row => (
          <div key={row.label}>
            <p className="text-xs text-muted uppercase tracking-wide mb-0.5">{row.label}</p>
            <p className="text-sm text-primary">{row.value}</p>
          </div>
        ))}
        <div>
          <p className="text-xs text-muted uppercase tracking-wide mb-0.5">CoE Status</p>
          <div className="flex items-center gap-2">
            <select
              value={prr.coeStatus}
              onChange={(event) => void onStatusChange(event.target.value as PrrCoeStatus)}
              disabled={updatingStatus}
              className="glass-input text-xs h-8 min-w-[140px]"
            >
              {PRR_COE_STATUSES.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <span className={`px-2 py-1 rounded-md text-xs font-medium border ${getCoeStatusBadgeStyle(prr.coeStatus)}`}>
              {prr.coeStatus}
            </span>
          </div>
        </div>
        <div>
          <p className="text-xs text-muted uppercase tracking-wide mb-0.5">Location</p>
          <p className="text-sm text-primary">{prr.location || '—'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-muted uppercase tracking-wide mb-1">Impact</p>
          <span className={`inline-flex px-2 py-1 rounded-md text-xs font-medium border ${getImpactBadgeStyle(prr.impact)}`}>
            {prr.impact || '—'}
          </span>
        </div>
        <div>
          <p className="text-xs text-muted uppercase tracking-wide mb-1">Attrition Risk</p>
          <span className={`inline-flex px-2 py-1 rounded-md text-xs font-medium border ${getRiskBadgeStyle(prr.attritionRisk)}`}>
            {prr.attritionRisk || '—'}
          </span>
        </div>
        {[
          { label: 'Request Date', value: formatDate(prr.requestDate) },
          { label: 'Days Opened', value: String(prr.daysOpened), mono: true },
          { label: 'Days Since Last Interview', value: String(prr.daysSinceLastInterview ?? '—') },
          { label: 'Transition Sub Type', value: prr.transitionSubType || '—' },
        ].map(row => (
          <div key={row.label}>
            <p className="text-xs text-muted uppercase tracking-wide mb-0.5">{row.label}</p>
            <p className={`text-sm text-primary ${row.mono ? 'font-mono' : ''}`}>{row.value}</p>
          </div>
        ))}
      </div>

      <div className="glass-panel-subtle p-4">
        <p className="text-xs text-muted uppercase tracking-wide mb-1">Upstream Comments</p>
        <p className="text-sm text-secondary whitespace-pre-wrap leading-relaxed">{prr.comments || '—'}</p>
      </div>
    </div>
  )
}
