import { useMemo, useState } from 'react'
import { Play, Square, Loader2, ChevronDown, ChevronRight, PlayCircle, CheckCircle, AlertCircle, Circle, Trash2, Search, X } from 'lucide-react'
import type { BraniacAnalysisStatusItem } from '../../../../../shared/ipc-types'

export interface SelectionTarget {
  account: string
  stakeholder?: string
}

interface BraniacRunCardProps {
  accountStatuses: Map<string, BraniacAnalysisStatusItem[]>
  isRunning: boolean
  currentJobId: string | null
  batchProgress: { current: number; total: number; currentAccount: string } | null
  onRun: (account: string, scope: 'account' | 'stakeholder', stakeholder?: string) => void
  onRunAll: (skipUpToDate: boolean) => void
  onRunMulti: (targets: SelectionTarget[]) => void
  onCancel: (jobId: string) => void
  onCancelBatch: () => void
}

function StatusIndicator({ item }: { item?: BraniacAnalysisStatusItem }) {
  if (!item || !item.lastAnalyzedAt) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 flex-shrink-0">
        <Circle className="h-3 w-3" /> Never analyzed
      </span>
    )
  }
  if (!item.hasNewData) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 flex-shrink-0">
        <CheckCircle className="h-3 w-3" /> Up to date
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 flex-shrink-0">
      <AlertCircle className="h-3 w-3" /> New data
    </span>
  )
}

function getSelectionLabel(selections: SelectionTarget[]): string {
  if (selections.length === 0) return ''
  if (selections.length === 1) {
    const s = selections[0]
    return s.stakeholder ? `${s.stakeholder} from ${s.account}` : `${s.account} (entire account)`
  }
  const accounts = new Set(selections.map(s => s.account))
  if (accounts.size === 1) {
    const account = [...accounts][0]
    const stakeholders = selections.filter(s => s.stakeholder)
    if (stakeholders.length === 0) return `${account} (entire account)`
    return `${stakeholders.length} stakeholders from ${account}`
  }
  return `${selections.length} targets across ${accounts.size} accounts`
}

function getButtonLabel(selections: SelectionTarget[]): string {
  if (selections.length === 0) return 'Analyze'
  if (selections.length === 1) {
    const s = selections[0]
    return `Analyze ${s.stakeholder ?? s.account}`
  }
  return `Analyze ${selections.length} Targets`
}

export default function BraniacRunCard({
  accountStatuses,
  isRunning,
  currentJobId,
  batchProgress,
  onRun,
  onRunAll,
  onRunMulti,
  onCancel,
  onCancelBatch,
}: BraniacRunCardProps) {
  const [selections, setSelections] = useState<SelectionTarget[]>([])
  const [filter, setFilter] = useState('')
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set())
  const [skipUpToDate, setSkipUpToDate] = useState(true)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [showRerunConfirm, setShowRerunConfirm] = useState(false)

  const isBusy = isRunning || !!batchProgress
  const totalAccounts = accountStatuses.size

  const filteredAccounts = useMemo(() => {
    const filterLower = filter.toLowerCase()
    return [...accountStatuses.entries()].filter(([account, items]) => {
      if (!filter) return true
      if (account.toLowerCase().includes(filterLower)) return true
      return items.some(item =>
        item.stakeholder?.toLowerCase().includes(filterLower)
      )
    })
  }, [accountStatuses, filter])

  const handleAccountClick = (account: string) => {
    if (isBusy) return
    setShowRerunConfirm(false)
    setSelections(prev => {
      const isSelected = prev.some(s => s.account === account && !s.stakeholder)
      if (isSelected) {
        return prev.filter(s => s.account !== account)
      }
      return [...prev.filter(s => s.account !== account), { account }]
    })
  }

  const toggleExpand = (account: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedAccounts(prev => {
      const next = new Set(prev)
      if (next.has(account)) next.delete(account)
      else next.add(account)
      return next
    })
  }

  const handleStakeholderClick = (account: string, stakeholder: string) => {
    if (isBusy) return
    setShowRerunConfirm(false)
    setSelections(prev => {
      const withoutAccount = prev.filter(s => !(s.account === account && !s.stakeholder))
      const isSelected = withoutAccount.some(s => s.account === account && s.stakeholder === stakeholder)
      if (isSelected) {
        return withoutAccount.filter(s => !(s.account === account && s.stakeholder === stakeholder))
      }
      return [...withoutAccount, { account, stakeholder }]
    })
  }

  const handleRun = () => {
    if (selections.length === 0 || isBusy) return

    const allUpToDate = selections.every(s => {
      const items = accountStatuses.get(s.account)
      if (!items) return false
      if (s.stakeholder) {
        const item = items.find(i => i.stakeholder === s.stakeholder)
        return item && !item.hasNewData && item.lastAnalyzedAt
      }
      const item = items.find(i => i.scope === 'account')
      return item && !item.hasNewData && item.lastAnalyzedAt
    })

    if (allUpToDate && !showRerunConfirm) {
      setShowRerunConfirm(true)
      return
    }
    setShowRerunConfirm(false)

    if (selections.length === 1) {
      const s = selections[0]
      onRun(s.account, s.stakeholder ? 'stakeholder' : 'account', s.stakeholder)
    } else {
      onRunMulti(selections)
    }
  }

  const handleClearAndReanalyze = async () => {
    if (selections.length === 0) return
    setIsClearing(true)
    try {
      for (const s of selections) {
        const clearParams = s.stakeholder
          ? { account: s.account, stakeholder: s.stakeholder }
          : { account: s.account }
        const { braniacService } = await import('../../services/braniacService')
        await braniacService.clearPatterns(clearParams)
      }
      setShowClearConfirm(false)
      if (selections.length === 1) {
        const s = selections[0]
        onRun(s.account, s.stakeholder ? 'stakeholder' : 'account', s.stakeholder)
      } else {
        onRunMulti(selections)
      }
    } finally {
      setIsClearing(false)
    }
  }

  const handleCancel = () => {
    if (currentJobId) onCancel(currentJobId)
  }

  const clearSelection = () => {
    setSelections([])
    setShowRerunConfirm(false)
    setShowClearConfirm(false)
  }

  const selectionLabel = getSelectionLabel(selections)
  const buttonLabel = getButtonLabel(selections)

  return (
    <div className="glass-panel p-5 rounded-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-primary">Run Braniac</h2>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              isBusy
                ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300'
                : 'bg-gray-100 text-gray-600 dark:bg-dark-muted/30 dark:text-gray-400'
            }`}
          >
            {isBusy && <Loader2 className="h-3 w-3 animate-spin" />}
            {batchProgress ? 'Batch Running' : isRunning ? 'Running' : 'Idle'}
          </span>
        </div>
      </div>

      {batchProgress && (
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-xs">
            <Loader2 className="h-4 w-4 text-violet-500 animate-spin flex-shrink-0" />
            <span className="text-secondary">
              Processing <strong>{batchProgress.current}</strong> of{' '}
              <strong>{batchProgress.total}</strong>: {batchProgress.currentAccount}
            </span>
          </div>
          <div className="h-1.5 bg-gray-200 dark:bg-dark-muted/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full transition-all duration-500"
              style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Filter input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter accounts & stakeholders…"
          className="glass-input w-full text-sm pl-9 pr-8"
          disabled={isBusy}
        />
        {filter && (
          <button
            onClick={() => setFilter('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Account & Stakeholder Tree */}
      <div className="glass-panel-subtle rounded-xl overflow-hidden">
        <div className="px-3 py-2 border-b border-gray-100 dark:border-dark-border/30">
          <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider">
            Accounts & Stakeholders
          </h3>
        </div>
        <div className="max-h-72 overflow-y-auto divide-y divide-gray-100/50 dark:divide-dark-border/20">
          {filteredAccounts.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-muted">
              {filter ? 'No matches found' : 'No accounts available'}
            </div>
          ) : (
            filteredAccounts.map(([account, items]) => {
              const accountItem = items.find(i => i.scope === 'account')
              const stakeholderItems = items.filter(i => i.scope === 'stakeholder')
              const isExpanded = expandedAccounts.has(account)
              const isAccountSelected = selections.some(s => s.account === account && !s.stakeholder)
              const hasSelectedStakeholders = selections.some(s => s.account === account && s.stakeholder)
              const filterLower = filter.toLowerCase()

              const filteredStakeholders = filter
                ? stakeholderItems.filter(item =>
                    item.stakeholder?.toLowerCase().includes(filterLower) ||
                    account.toLowerCase().includes(filterLower)
                  )
                : stakeholderItems

              return (
                <div key={account}>
                  {/* Account row */}
                  <div
                    onClick={() => handleAccountClick(account)}
                    className={`flex items-center justify-between py-2.5 px-3 cursor-pointer transition-all ${
                      isAccountSelected
                        ? 'bg-violet-500/15 border-l-[3px] border-violet-500'
                        : hasSelectedStakeholders
                        ? 'bg-violet-500/5 border-l-[3px] border-violet-500/30'
                        : 'hover:bg-gray-100/50 dark:hover:bg-dark-muted/20 border-l-[3px] border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm min-w-0">
                      <button
                        onClick={(e) => toggleExpand(account, e)}
                        className="flex-shrink-0 p-0.5 rounded hover:bg-gray-200/50 dark:hover:bg-dark-muted/30 transition-colors"
                        disabled={isBusy}
                      >
                        {isExpanded
                          ? <ChevronDown className="h-3.5 w-3.5 text-muted" />
                          : <ChevronRight className="h-3.5 w-3.5 text-muted" />
                        }
                      </button>
                      <span className="text-primary font-medium truncate">📊 {account}</span>
                      <span className="text-xs text-muted flex-shrink-0">
                        ({accountItem?.currentDataPoints ?? 0} pts)
                      </span>
                    </div>
                    <StatusIndicator item={accountItem} />
                  </div>

                  {/* Stakeholder rows (when expanded) */}
                  {isExpanded && filteredStakeholders.map(item => {
                    const isStakeholderSelected = selections.some(
                      s => s.account === account && s.stakeholder === item.stakeholder
                    )
                    return (
                      <div
                        key={item.stakeholder}
                        onClick={() => handleStakeholderClick(account, item.stakeholder!)}
                        className={`flex items-center justify-between py-2 px-3 pl-10 cursor-pointer transition-all ${
                          isStakeholderSelected
                            ? 'bg-violet-500/10 border-l-[3px] border-violet-500'
                            : 'hover:bg-gray-100/30 dark:hover:bg-dark-muted/10 border-l-[3px] border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2 text-sm min-w-0">
                          <span className="text-primary truncate">👤 {item.stakeholder}</span>
                          <span className="text-xs text-muted flex-shrink-0">
                            ({item.currentDataPoints} pts)
                          </span>
                        </div>
                        <StatusIndicator item={item} />
                      </div>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Selection summary */}
      {selections.length > 0 && (
        <div className="glass-panel-subtle p-3 rounded-xl flex items-center justify-between">
          <div className="text-sm">
            <span className="text-xs font-medium text-secondary uppercase tracking-wider">Will analyze: </span>
            <span className="text-primary font-medium">{selectionLabel}</span>
          </div>
          <button
            onClick={clearSelection}
            disabled={isBusy}
            className="text-xs text-muted hover:text-primary transition-colors disabled:opacity-40"
          >
            Clear
          </button>
        </div>
      )}

      {/* Re-run confirmation */}
      {showRerunConfirm && (
        <div className="glass-panel-subtle p-3 rounded-xl bg-amber-50/50 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-500/20">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            No new data since last analysis. Re-run anyway?
          </p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => { setShowRerunConfirm(false); handleRun() }}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors"
            >
              Yes, re-run
            </button>
            <button
              onClick={() => setShowRerunConfirm(false)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg glass-button text-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Clear & re-analyze confirmation */}
      {showClearConfirm && (
        <div className="glass-panel-subtle p-3 rounded-xl bg-red-50/50 dark:bg-red-500/10 border border-red-200/50 dark:border-red-500/20">
          <p className="text-xs text-red-700 dark:text-red-400">
            This will delete existing patterns for <strong>{selectionLabel}</strong> and re-analyze from scratch.
          </p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleClearAndReanalyze}
              disabled={isClearing}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 transition-colors"
            >
              {isClearing ? 'Clearing...' : 'Clear & Re-analyze'}
            </button>
            <button
              onClick={() => setShowClearConfirm(false)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg glass-button text-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {batchProgress ? (
          <button
            onClick={onCancelBatch}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors text-sm font-medium"
          >
            <Square className="h-4 w-4" />
            Cancel Batch
          </button>
        ) : isRunning ? (
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors text-sm font-medium"
          >
            <Square className="h-4 w-4" />
            Cancel
          </button>
        ) : (
          <>
            <button
              onClick={handleRun}
              disabled={selections.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-500/20 transition-colors text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Play className="h-4 w-4" />
              {buttonLabel}
            </button>
            <button
              onClick={() => onRunAll(skipUpToDate)}
              disabled={totalAccounts === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-violet-300 dark:border-violet-500/30 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 transition-colors text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <PlayCircle className="h-4 w-4" />
              Analyze All ({totalAccounts})
            </button>
            {selections.length > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-300 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors text-sm font-medium"
              >
                <Trash2 className="h-4 w-4" />
                Clear & Re-analyze
              </button>
            )}
          </>
        )}
      </div>

      {!isBusy && totalAccounts > 1 && (
        <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
          <input
            type="checkbox"
            checked={skipUpToDate}
            onChange={(e) => setSkipUpToDate(e.target.checked)}
            className="accent-violet-500"
          />
          Skip accounts with no new data during batch
        </label>
      )}

      {!isBusy && selections.length > 0 && (
        <p className="text-xs text-muted">
          Analyzes all historical positions and candidates for <strong>{selectionLabel}</strong>
          {' '}to infer stakeholder preferences, rate patterns, and hiring behaviors.
        </p>
      )}
    </div>
  )
}
