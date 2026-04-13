import { useNexusStatus } from '../../contexts/NexusStatusContext';

function formatNumber(n: number): string {
  return n.toLocaleString();
}

export default function TokenUsageModal() {
  const { tokens, resetTokenUsage, modals, closeModal } = useNexusStatus();

  if (!modals.tokens) return null;

  const total = tokens.inputTokens + tokens.outputTokens;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => closeModal('tokens')} />

      <div className="glass-card relative z-10 w-full max-w-sm mx-4 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-primary">Token Usage</h3>
          <button
            onClick={() => closeModal('tokens')}
            className="p-1 text-muted hover:text-secondary transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="glass-panel-subtle rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-accent-500 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              <span className="text-sm text-muted">Input (prompt)</span>
            </div>
            <span className="text-sm font-mono font-semibold text-primary">{formatNumber(tokens.inputTokens)}</span>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-violet-500 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              <span className="text-sm text-muted">Output (completion)</span>
            </div>
            <span className="text-sm font-mono font-semibold text-primary">{formatNumber(tokens.outputTokens)}</span>
          </div>

          <div className="minimal-divider" />

          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-secondary">Total</span>
            <span className="text-sm font-mono font-bold text-primary">{formatNumber(total)}</span>
          </div>
        </div>

        <p className="text-xs text-muted text-center">
          Session-scoped — resets on app restart
        </p>

        <button
          onClick={resetTokenUsage}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium text-secondary bg-white/50 dark:bg-dark-hover/50 border border-gray-200 dark:border-dark-border rounded-xl hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors"
        >
          Reset Counters
        </button>
      </div>
    </div>
  );
}
