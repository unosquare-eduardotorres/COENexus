import { useNexusStatus } from '../../contexts/NexusStatusContext';

export default function ClaudeStatusModal() {
  const { claude, checkClaude, modals, closeModal } = useNexusStatus();

  if (!modals.claude) return null;

  const statusColor = claude.checking
    ? 'bg-amber-400 animate-pulse'
    : claude.connected
      ? 'bg-emerald-400'
      : 'bg-red-400';

  const statusLabel = claude.checking
    ? 'Checking connection...'
    : claude.connected
      ? 'Connected'
      : 'Offline';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => closeModal('claude')} />

      <div className="glass-card relative z-10 w-full max-w-sm mx-4 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-primary">Claude Connection Status</h3>
          <button
            onClick={() => closeModal('claude')}
            className="p-1 text-muted hover:text-secondary transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className={`h-3 w-3 rounded-full ${statusColor}`} />
            <span className="text-sm font-medium text-primary">{statusLabel}</span>
          </div>

          <div className="glass-panel-subtle rounded-xl p-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">CLI Installed</span>
              <span className={`text-xs font-medium ${claude.cliInstalled ? 'text-emerald-500' : 'text-red-400'}`}>
                {claude.cliInstalled ? 'Yes' : 'No'}
              </span>
            </div>
            {claude.cliVersion && (
              <div className="flex justify-between">
                <span className="text-muted">CLI Version</span>
                <span className="font-mono text-secondary text-xs">{claude.cliVersion}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted">Auth Status</span>
              <span className={`text-xs font-medium ${claude.authenticated ? 'text-emerald-500' : 'text-red-400'}`}>
                {claude.authenticated ? 'Authenticated' : 'Not Authenticated'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Subscription</span>
              <span className={`text-xs font-medium ${claude.plan ? 'text-emerald-500' : 'text-muted'}`}>
                {claude.plan ?? 'Unknown'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Last Checked</span>
              <span className="text-secondary">
                {claude.lastChecked ? claude.lastChecked.toLocaleTimeString() : 'Never'}
              </span>
            </div>
          </div>

          {!claude.connected && !claude.checking && (
            <div className="glass-panel-subtle rounded-xl p-4 space-y-2 text-xs">
              <p className="font-medium text-amber-500">Troubleshooting</p>
              {!claude.cliInstalled && (
                <div className="space-y-1">
                  <p className="text-muted">Claude Code CLI not found. Install it:</p>
                  <code className="block bg-black/20 dark:bg-white/5 rounded-lg px-3 py-1.5 text-secondary font-mono">
                    npm i -g @anthropic-ai/claude-code
                  </code>
                </div>
              )}
              {claude.cliInstalled && !claude.authenticated && (
                <div className="space-y-1">
                  <p className="text-muted">CLI installed but not authenticated. Run:</p>
                  <code className="block bg-black/20 dark:bg-white/5 rounded-lg px-3 py-1.5 text-secondary font-mono">
                    claude login
                  </code>
                </div>
              )}
              {claude.error && (
                <p className="text-red-400 break-words">{claude.error}</p>
              )}
            </div>
          )}
        </div>

        <button
          onClick={checkClaude}
          disabled={claude.checking}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-accent-500 text-white rounded-xl hover:bg-accent-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {claude.checking ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Checking...
            </>
          ) : (
            'Check Now'
          )}
        </button>
      </div>
    </div>
  );
}
