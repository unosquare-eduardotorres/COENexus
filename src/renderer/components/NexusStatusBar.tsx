import { useNavigate } from 'react-router-dom';
import { useNexusStatus } from '../contexts/NexusStatusContext';
import { useSyncActivity, SOURCE_LABELS, type SyncProgress } from '../contexts/SyncActivityContext';
import { formatCountdown } from '../shared/utils/tokenUtils';

function formatTokenCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

function getCountdownColor(ms: number): string {
  const minutes = ms / 60_000;
  if (minutes > 30) return 'text-emerald-400';
  if (minutes > 10) return 'text-amber-400';
  return 'text-red-400';
}

function SyncPill({ sync, onClick }: { sync: SyncProgress; onClick: () => void }) {
  const label = SOURCE_LABELS[sync.source] ?? sync.source
  const isProcessing = sync.status === 'processing'
  const isPaused = sync.status === 'paused'
  const isCompleted = sync.status === 'completed'

  const dotClass = isProcessing
    ? 'bg-cyan-400 animate-pulse'
    : isPaused
      ? 'bg-amber-400'
      : 'bg-emerald-400'

  const textClass = isProcessing
    ? 'text-cyan-400'
    : isPaused
      ? 'text-amber-400'
      : 'text-emerald-400'

  const statusIcon = isCompleted
    ? '✓'
    : isPaused
      ? '⏸'
      : ''

  const progressText = sync.totalRecords > 0
    ? `${sync.processedRecords.toLocaleString()}/${sync.totalRecords.toLocaleString()}`
    : ''

  const pauseReasonText = sync.pauseReason === 'token-expiring'
    ? 'token expired'
    : sync.pauseReason === 'error'
      ? 'error'
      : 'user paused'

  const tooltip = isPaused
    ? `${label} ${progressText} — Paused (${pauseReasonText}) · Click to resume`
    : isCompleted
      ? `${label} — Completed`
      : `${label} — Syncing ${progressText}`

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all hover:opacity-80 ${
        isProcessing
          ? 'border-cyan-500/30 bg-cyan-500/10'
          : isPaused
            ? 'border-amber-500/40 bg-amber-500/10 animate-pulse'
            : 'border-emerald-500/30 bg-emerald-500/10'
      }`}
      title={tooltip}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
      <span className={`font-semibold ${textClass}`}>
        {statusIcon} {label}
      </span>
      {progressText && (
        <span className="text-muted font-mono">{progressText}</span>
      )}
      <span className="flex items-center gap-1.5">
        <span className="text-emerald-400">✓{sync.succeededCount}</span>
        <span className="text-red-400">✗{sync.failedCount}</span>
        <span className="text-gray-400">⊘{sync.skippedCount}</span>
      </span>
    </button>
  )
}

export default function NexusStatusBar() {
  const { claude, tokens, sharepoint, openModal, agentActivities } = useNexusStatus();
  const { activeSyncs, dismissSync } = useSyncActivity();
  const navigate = useNavigate();

  const handleSyncClick = (sync: SyncProgress) => {
    if (sync.status === 'completed') {
      dismissSync(sync.source)
    }
    navigate('/datasync')
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 h-7 border-t border-white/5 bg-white/60 dark:bg-dark-surface/80 backdrop-blur-xl flex items-center justify-between px-4 text-[11px] font-medium select-none">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => openModal('claude')}
          className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              claude.checking
                ? 'bg-amber-400 animate-pulse'
                : claude.connected
                  ? 'bg-emerald-400'
                  : 'bg-red-400'
            }`}
          />
          <span className="text-secondary">
            {claude.checking ? 'Checking...' : claude.connected ? 'Claude Connected' : 'Claude Offline'}
          </span>
        </button>

        {agentActivities.length > 0 && (
          <>
            <div className="h-3 w-px bg-gray-300/40 dark:bg-dark-border/40" />
            {agentActivities.map((agent) => (
              <button
                key={agent.id}
                type="button"
                onClick={() => navigate(`/agents/${agent.id}`)}
                className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                title={`${agent.name} is ${agent.status}`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-blue-400 dark:text-blue-300">
                  {agent.name} syncing…
                </span>
              </button>
            ))}
          </>
        )}

        <div className="h-3 w-px bg-gray-300/40 dark:bg-dark-border/40" />

        <button
          type="button"
          onClick={() => openModal('tokens')}
          className="flex items-center gap-2 text-muted hover:text-secondary transition-colors"
        >
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            {formatTokenCount(tokens.inputTokens)}
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            {formatTokenCount(tokens.outputTokens)}
          </span>
        </button>

        <div className="h-3 w-px bg-gray-300/40 dark:bg-dark-border/40" />

        <button
          type="button"
          onClick={() => navigate('/settings')}
          className="flex items-center gap-1.5 text-muted hover:text-secondary transition-colors"
          title="Settings"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-3">
        {activeSyncs.map(sync => (
          <SyncPill
            key={sync.source}
            sync={sync}
            onClick={() => handleSyncClick(sync)}
          />
        ))}

        {activeSyncs.length > 0 && (
          <div className="h-3 w-px bg-gray-300/40 dark:bg-dark-border/40" />
        )}

        <button
          type="button"
          onClick={() => openModal('sharepoint')}
          className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              sharepoint.isValid ? 'bg-emerald-400' : 'bg-gray-400'
            }`}
          />
          {sharepoint.isValid ? (
            <span className={`font-mono ${getCountdownColor(sharepoint.remainingMs)}`}>
              SP {formatCountdown(sharepoint.remainingMs)}
            </span>
          ) : (
            <span className="text-muted">SP Not Connected</span>
          )}
        </button>
      </div>
    </div>
  );
}
