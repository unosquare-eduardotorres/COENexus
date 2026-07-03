import { Fragment } from 'react'
import { PRR_COE_STATUSES, type PrrCoeStatus, type PrrReportItem } from '../../types'

type SortKey = 'employee' | 'account' | 'team' | 'mainSkill' | 'seniority' | 'transitionStatus' | 'coeStatus' | 'location' | 'daysOpened'

const COLUMN_SORT_MAP: Record<string, SortKey> = {
  'Employee': 'employee',
  'Client': 'account',
  'Team': 'team',
  'Main Skill': 'mainSkill',
  'Seniority': 'seniority',
  'PRR Status': 'transitionStatus',
  'CoE Status': 'coeStatus',
  'Location': 'location',
  'Days Opened': 'daysOpened',
}

function getCoeStatusSelectStyle(status: PrrCoeStatus): string {
  const styleMap: Record<PrrCoeStatus, string> = {
    'Not Set': 'bg-gray-500/10 text-gray-400 border-gray-500/20 focus:ring-gray-500/20',
    'Pending Evaluation': 'bg-amber-500/15 text-amber-400 border-amber-500/30 focus:ring-amber-500/30',
    'Ready to Present': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 focus:ring-emerald-500/30',
    'Presented': 'bg-teal-500/15 text-teal-400 border-teal-500/30 focus:ring-teal-500/30',
    'Needs Attention': 'bg-rose-500/15 text-rose-400 border-rose-500/30 focus:ring-rose-500/30',
    'Not Applies': 'bg-slate-500/10 text-slate-400 border-slate-500/20 focus:ring-slate-500/20',
    'Other': 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30 focus:ring-indigo-500/30',
    'Closed': 'bg-red-500/15 text-red-400 border-red-500/30 focus:ring-red-500/30',
  }
  return styleMap[status] ?? styleMap['Not Set']
}

function getDaysOpenedStyle(daysOpened: number): string {
  if (daysOpened >= 45) return 'text-red-400'
  if (daysOpened >= 21) return 'text-amber-400'
  if (daysOpened >= 7) return 'text-yellow-400'
  return 'text-emerald-400'
}

interface PrrReportTableProps {
  sortedResults: PrrReportItem[]
  sortKey: SortKey
  sortDirection: 'asc' | 'desc'
  hasClosedItems: boolean
  savingStatusIds: number[]
  deletingIds: number[]
  onSort: (key: SortKey, direction: 'asc' | 'desc') => void
  onSelectPosition: (upstreamId: number) => void
  onCoeStatusChange: (upstreamId: number, status: PrrCoeStatus) => void
  onDelete: (upstreamId: number) => void
}

export default function PrrReportTable({
  sortedResults,
  sortKey,
  sortDirection,
  hasClosedItems,
  savingStatusIds,
  deletingIds,
  onSort,
  onSelectPosition,
  onCoeStatusChange,
  onDelete,
}: PrrReportTableProps) {
  const columnCount = 9 + (hasClosedItems ? 1 : 0)

  return (
    <div className="glass-panel overflow-hidden rounded-xl">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-dark-bg/95 backdrop-blur">
          <tr className="border-b border-white/10">
            {[
              'Employee', 'Client', 'Team', 'Main Skill', 'Seniority',
              'PRR Status', 'CoE Status', 'Location', 'Days Opened',
              ...(hasClosedItems ? ['Actions'] : []),
            ].map(column => {
              const columnSortKey = COLUMN_SORT_MAP[column]
              const isSorted = columnSortKey && sortKey === columnSortKey

              return (
                <th
                  key={column}
                  className={`text-left text-[11px] font-semibold uppercase tracking-wider px-3 py-3 first:pl-4 last:pr-4 ${
                    columnSortKey ? 'cursor-pointer select-none hover:text-secondary transition-colors' : ''
                  } ${isSorted ? 'text-emerald-400' : 'text-muted'}`}
                  onClick={columnSortKey ? () => {
                    if (sortKey === columnSortKey) {
                      onSort(columnSortKey, sortDirection === 'asc' ? 'desc' : 'asc')
                    } else {
                      onSort(columnSortKey, 'desc')
                    }
                  } : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {column}
                    {isSorted && (
                      <span className={`transition-transform ${sortDirection === 'asc' ? 'rotate-180' : ''}`}>▾</span>
                    )}
                  </span>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {sortedResults.map((item, index) => {
            const isSavingStatus = savingStatusIds.includes(item.upstreamId)
            const isDeleting = deletingIds.includes(item.upstreamId)
            const stripe = index % 2 === 0 ? '' : 'bg-white/[0.02]'
            const hasComments = !!(item.comments || item.coeComments.length > 0)

            return (
              <Fragment key={item.upstreamId}>
                <tr
                  className={`hover:bg-white/[0.04] cursor-pointer transition-colors ${stripe}`}
                  onClick={() => onSelectPosition(item.upstreamId)}
                >
                  <td className="px-3 py-2.5 first:pl-4 text-primary font-medium align-top">{item.employee || '—'}</td>
                  <td className="px-3 py-2.5 text-secondary align-top">{item.account || '—'}</td>
                  <td className="px-3 py-2.5 text-secondary align-top">{item.team || '—'}</td>
                  <td className="px-2 py-2.5 text-secondary whitespace-nowrap align-top">{item.mainSkill || '—'}</td>
                  <td className="px-2 py-2.5 text-secondary whitespace-nowrap align-top">{item.seniority || '—'}</td>
                  <td className="px-2 py-2.5 text-secondary whitespace-nowrap align-top">{item.transitionStatus || '—'}</td>
                  <td className="px-3 py-2.5 align-top">
                    <select
                      value={item.coeStatus}
                      disabled={isSavingStatus}
                      onClick={event => event.stopPropagation()}
                      onChange={event => {
                        event.stopPropagation()
                        void onCoeStatusChange(item.upstreamId, event.target.value as PrrCoeStatus)
                      }}
                      className={`h-7 px-2 pr-7 rounded-md text-xs font-medium border appearance-none cursor-pointer transition-colors focus:outline-none focus:ring-1 ${getCoeStatusSelectStyle(item.coeStatus)}`}
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center' }}
                    >
                      {PRR_COE_STATUSES.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2.5 text-secondary whitespace-nowrap align-top">{item.location || '—'}</td>
                  <td className="px-2 py-2.5 whitespace-nowrap text-center align-top">
                    <span className={`font-mono font-bold ${getDaysOpenedStyle(item.daysOpened)}`}>
                      {item.daysOpened}d
                    </span>
                  </td>
                  {hasClosedItems && (
                    <td className="px-3 py-2.5 last:pr-4 align-top">
                      {item.coeStatus === 'Closed' ? (
                        <button
                          type="button"
                          onClick={event => {
                            event.stopPropagation()
                            void onDelete(item.upstreamId)
                          }}
                          disabled={isDeleting}
                          className="px-2 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isDeleting ? 'Deleting...' : 'Delete'}
                        </button>
                      ) : (
                        <span className="text-[11px] text-muted uppercase tracking-wider">—</span>
                      )}
                    </td>
                  )}
                </tr>

                {hasComments && (
                  <tr
                    className="cursor-pointer transition-colors bg-white/[0.015]"
                    onClick={() => onSelectPosition(item.upstreamId)}
                  >
                    <td colSpan={columnCount} className="pl-5 pr-4 pb-2.5 pt-1 text-xs">
                      <div className="flex gap-8">
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] uppercase tracking-wider bg-amber-500/10 text-amber-400/80 px-1.5 py-0.5 rounded mr-2">Upstream</span>
                          <span className="break-words text-muted">{item.comments || '—'}</span>
                        </div>
                        <div className="w-px bg-white/5 self-stretch" />
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] uppercase tracking-wider bg-blue-500/10 text-blue-400/80 px-1.5 py-0.5 rounded mr-2">COE</span>
                          <span className="break-words text-muted">
                            {item.coeComments.length > 0 ? item.coeComments.map(c => c.text).join(' | ') : '—'}
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}

                <tr className="h-1.5 bg-[#0a0a0f]" aria-hidden="true">
                  <td colSpan={columnCount} className="p-0" />
                </tr>
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
