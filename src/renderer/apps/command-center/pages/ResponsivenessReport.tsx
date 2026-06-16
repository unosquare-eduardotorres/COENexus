import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useResponsivenessReport } from '../hooks/useResponsivenessReport'
import PositionDetailDrawer from '../components/PositionDetailDrawer'
import { SearchIcon, XIcon, ChatBubbleIcon, SortableColumnIcon as SortIcon, DatabaseIcon } from '../components/Icons'
import type { ResponsivenessLeadSummary } from '../../../../shared/ipc-types'

// ── Helpers ─────────────────────────────────────────────────

function formatWaitingTime(days: number): string {
  if (days === 0) return 'Today'
  if (days === 1) return '1 day'
  if (days < 7) return `${days} days`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return weeks === 1 ? '1 week' : `${weeks} weeks`
  const months = Math.floor(days / 30)
  return months === 1 ? '1 month' : `${months} months`
}

function truncateMessage(message: string, maxLen = 80): string {
  // Strip HTML tags if any
  const clean = message.replace(/<[^>]*>/g, '').trim()
  return clean.length > maxLen ? clean.slice(0, maxLen) + '…' : clean
}

// ── Summary Cards ──────────────────────────────────────────

function SummaryCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="glass-panel p-4 rounded-xl">
      <p className="text-[11px] uppercase tracking-wider text-muted font-semibold mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-muted mt-0.5">{sub}</p>}
    </div>
  )
}

function LeadBadge({ lead }: { lead: ResponsivenessLeadSummary }) {
  const rateColor = lead.responseRate >= 80 ? 'text-emerald-400' : lead.responseRate >= 50 ? 'text-amber-400' : 'text-red-400'
  const bgColor = lead.responseRate >= 80 ? 'bg-emerald-500/10 border-emerald-500/20' : lead.responseRate >= 50 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20'

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${bgColor}`}>
      <span className="text-xs font-medium text-primary">{lead.name}</span>
      <span className={`text-xs font-bold ${rateColor}`}>{lead.responseRate}%</span>
      <span className="text-[10px] text-muted">
        {lead.unanswered}/{lead.totalMentions}
      </span>
    </div>
  )
}

// ── Sortable Header ────────────────────────────────────────

type SortField = 'positionUpstreamId' | 'account' | 'coe' | 'mentionAuthorName' | 'taggedLeadName' | 'waitingDays'

function SortableHeader({ label, field, currentField, currentDir, onSort, className = '' }: {
  label: string
  field: SortField
  currentField: SortField
  currentDir: 'asc' | 'desc'
  onSort: (field: SortField) => void
  className?: string
}) {
  return (
    <th
      className={`text-left text-[11px] font-semibold uppercase tracking-wider text-muted py-3 px-3 cursor-pointer hover:text-secondary select-none ${className}`}
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <SortIcon active={currentField === field} dir={currentDir} />
      </span>
    </th>
  )
}

// ── Main Component ─────────────────────────────────────────

export default function ResponsivenessReport() {
  const {
    report,
    loading,
    error,
    search,
    leadFilter,
    coeFilter,
    sortField,
    sortDir,
    filteredItems,
    filterOptions,
    setSearch,
    setLeadFilter,
    setCoeFilter,
    setSort,
    refresh,
  } = useResponsivenessReport()

  const [selectedPositionId, setSelectedPositionId] = useState<number | null>(null)

  // ── Loading state ──
  if (loading && !report) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted">Analyzing discussions...</span>
        </div>
      </div>
    )
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16 space-y-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-500/15 dark:bg-red-400/15">
          <XIcon />
        </div>
        <h2 className="text-lg font-semibold text-primary">Error Loading Report</h2>
        <p className="text-sm text-secondary">{error}</p>
        <button onClick={refresh} className="mt-2 px-4 py-2 text-sm rounded-lg bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 transition-colors">
          Retry
        </button>
      </div>
    )
  }

  // ── Empty state ──
  if (!report || (report.totalMentions === 0 && report.leadSummary.length === 0)) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16 space-y-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-500/15 dark:bg-blue-400/15">
          <DatabaseIcon />
        </div>
        <h2 className="text-lg font-semibold text-primary">No Mentions Found</h2>
        <p className="text-sm text-secondary">
          No tracked leads have been @-mentioned in active position discussions yet.
          <br />
          Sync data from D.A.T.A. first to populate discussions.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-blue-500/15 dark:bg-blue-400/15 flex items-center justify-center text-blue-500 dark:text-blue-400">
          <ChatBubbleIcon />
        </div>
        <div>
          <h1 className="text-xl font-bold text-primary">Responsiveness</h1>
          <p className="text-sm text-secondary mt-0.5">Track unanswered @-mentions of COE Practice Leads in position discussions</p>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <SummaryCard
          label="Total Mentions"
          value={report.totalMentions}
          color="text-primary"
        />
        <SummaryCard
          label="Unanswered"
          value={report.unansweredMentions}
          sub={report.unansweredMentions === 0 ? 'All caught up!' : undefined}
          color={report.unansweredMentions > 0 ? 'text-red-400' : 'text-emerald-400'}
        />
        <SummaryCard
          label="Response Rate"
          value={`${report.responseRate}%`}
          color={report.responseRate >= 80 ? 'text-emerald-400' : report.responseRate >= 50 ? 'text-amber-400' : 'text-red-400'}
        />
      </div>

      {/* ── Per-Lead Badges ── */}
      {report.leadSummary.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {report.leadSummary.map((lead: ResponsivenessLeadSummary) => (
            <LeadBadge key={lead.email} lead={lead} />
          ))}
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted">
            <SearchIcon />
          </div>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search account, person, lead..."
            className="glass-input w-full py-2 pl-10 pr-8 text-sm rounded-lg"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted hover:text-secondary"
            >
              <XIcon />
            </button>
          )}
        </div>

        {/* Lead filter */}
        <select
          value={leadFilter}
          onChange={e => setLeadFilter(e.target.value)}
          className="glass-select text-sm py-2 pl-3 pr-8 min-w-[160px]"
        >
          <option value="all">All Leads</option>
          {filterOptions.leads.map((l: ResponsivenessLeadSummary) => (
            <option key={l.email} value={l.email}>{l.name} ({l.unanswered})</option>
          ))}
        </select>

        {/* COE filter */}
        {filterOptions.coes.length > 0 && (
          <select
            value={coeFilter}
            onChange={e => setCoeFilter(e.target.value)}
            className="glass-select text-sm py-2 pl-3 pr-8 min-w-[140px]"
          >
            <option value="all">All C.O.E.s</option>
            {filterOptions.coes.map((c: string) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}

        {/* Clear filters */}
        {(search || leadFilter !== 'all' || coeFilter !== 'all') && (
          <button
            onClick={() => { setSearch(''); setLeadFilter('all'); setCoeFilter('all') }}
            className="text-xs text-muted hover:text-secondary transition-colors"
          >
            Clear filters
          </button>
        )}

        {/* Result count */}
        <span className="ml-auto text-xs text-muted">
          {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* ── Table ── */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-muted">
            {report.unansweredMentions === 0
              ? '🎉 All mentions have been answered!'
              : 'No items match the current filters.'
            }
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto glass-panel rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <SortableHeader label="Position" field="positionUpstreamId" currentField={sortField} currentDir={sortDir} onSort={setSort} className="w-[90px]" />
                <SortableHeader label="Account" field="account" currentField={sortField} currentDir={sortDir} onSort={setSort} />
                <SortableHeader label="C.O.E." field="coe" currentField={sortField} currentDir={sortDir} onSort={setSort} />
                <SortableHeader label="Who Asked" field="mentionAuthorName" currentField={sortField} currentDir={sortDir} onSort={setSort} />
                <SortableHeader label="Tagged Lead" field="taggedLeadName" currentField={sortField} currentDir={sortDir} onSort={setSort} />
                <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted py-3 px-3">Message</th>
                <SortableHeader label="Waiting" field="waitingDays" currentField={sortField} currentDir={sortDir} onSort={setSort} className="text-right w-[90px]" />
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item, idx) => (
                <tr
                  key={`${item.mentionCommentId}-${item.taggedLeadEmail}`}
                  onClick={() => setSelectedPositionId(item.positionUpstreamId)}
                  className={`border-b border-white/[0.03] cursor-pointer transition-colors hover:bg-white/[0.03] ${
                    idx % 2 === 0 ? '' : 'bg-white/[0.01]'
                  }`}
                >
                  <td className="py-3 px-3">
                    <span className="font-mono text-xs text-blue-400">#{item.positionUpstreamId}</span>
                  </td>
                  <td className="py-3 px-3 font-medium text-primary">{item.account}</td>
                  <td className="py-3 px-3 text-secondary">{item.coe || '—'}</td>
                  <td className="py-3 px-3 text-secondary">{item.mentionAuthorName}</td>
                  <td className="py-3 px-3">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                      <span className="text-primary font-medium">{item.taggedLeadName}</span>
                    </span>
                  </td>
                  <td className="py-3 px-3 text-muted max-w-[260px]">
                    <span className="line-clamp-1" title={item.mentionMessage}>
                      {truncateMessage(item.mentionMessage)}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className={`text-xs font-medium ${
                      item.waitingDays >= 7 ? 'text-red-400' : item.waitingDays >= 3 ? 'text-amber-400' : 'text-secondary'
                    }`}>
                      {formatWaitingTime(item.waitingDays)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Position Detail Drawer ── */}
      {selectedPositionId && createPortal(
        <PositionDetailDrawer
          upstreamId={selectedPositionId}
          onClose={() => setSelectedPositionId(null)}
        />,
        document.body
      )}
    </div>
  )
}
