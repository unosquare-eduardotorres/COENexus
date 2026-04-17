import { useState } from 'react'
import { Play, Square, Loader2, ChevronDown } from 'lucide-react'

interface BraniacRunCardProps {
  accounts: string[]
  isRunning: boolean
  currentJobId: string | null
  onRun: (account: string, scope: 'account' | 'stakeholder') => void
  onCancel: (jobId: string) => void
}

export default function BraniacRunCard({
  accounts,
  isRunning,
  currentJobId,
  onRun,
  onCancel,
}: BraniacRunCardProps) {
  const [selectedAccount, setSelectedAccount] = useState('')

  const handleRun = () => {
    if (!selectedAccount || isRunning) return
    onRun(selectedAccount, 'account')
  }

  const handleCancel = () => {
    if (currentJobId) onCancel(currentJobId)
  }

  return (
    <div className="glass-panel p-5 rounded-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-primary">Run Braniac</h2>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              isRunning
                ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300'
                : 'bg-gray-100 text-gray-600 dark:bg-dark-muted/30 dark:text-gray-400'
            }`}
          >
            {isRunning && <Loader2 className="h-3 w-3 animate-spin" />}
            {isRunning ? 'Running' : 'Idle'}
          </span>
        </div>
      </div>

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-xs font-medium text-secondary mb-1.5">
            Account
          </label>
          <div className="relative">
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              disabled={isRunning}
              className="glass-select w-full text-sm"
            >
              <option value="">Select an account…</option>
              {accounts.map((account) => (
                <option key={account} value={account}>
                  {account}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
          </div>
        </div>

        {isRunning ? (
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors text-sm font-medium"
          >
            <Square className="h-4 w-4" />
            Cancel
          </button>
        ) : (
          <button
            onClick={handleRun}
            disabled={!selectedAccount}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-500/20 transition-colors text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Play className="h-4 w-4" />
            Analyze
          </button>
        )}
      </div>

      {!isRunning && selectedAccount && (
        <p className="text-xs text-muted">
          Analyzes all historical positions and candidates for <strong>{selectedAccount}</strong> to infer stakeholder preferences, rate patterns, and hiring behaviors.
        </p>
      )}
    </div>
  )
}
