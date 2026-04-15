import { useState } from 'react'

interface QuickActionsBarProps {
  onWakeNow: (token: string) => Promise<void> | void
  onPause: () => Promise<void> | void
  isSyncing: boolean
  tokenReady: boolean
  loading: boolean
}

export default function QuickActionsBar({ onWakeNow, onPause, isSyncing, tokenReady, loading }: QuickActionsBarProps) {
  const [token, setToken] = useState('')

  async function handleWakeNow() {
    await onWakeNow(token)
  }

  async function handlePause() {
    await onPause()
  }

  return (
    <section className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-primary">Quick Actions</h3>
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${tokenReady ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          <span className="text-xs text-muted">{tokenReady ? 'Token cached' : 'Token required'}</span>
        </div>
      </div>

      <div className="grid gap-3">
        <input
          value={token}
          onChange={(event) => setToken(event.target.value)}
          type="password"
          placeholder="Enter sync token"
          className="glass-input h-10 px-3 text-sm"
        />

        <div className="flex items-center gap-2">
          <button
            onClick={handleWakeNow}
            disabled={loading}
            className="glass-button h-10 px-4 text-sm font-semibold text-primary"
            style={{ borderColor: '#94a3b860', boxShadow: 'inset 0 0 0 1px #94a3b840' }}
          >
            {loading ? 'Waking...' : 'Wake Up Now'}
          </button>

          <button
            onClick={handlePause}
            disabled={!isSyncing || loading}
            className="glass-button h-10 px-4 text-sm font-semibold text-primary disabled:opacity-50"
          >
            {loading && isSyncing ? 'Pausing...' : 'Pause'}
          </button>
        </div>
      </div>
    </section>
  )
}
