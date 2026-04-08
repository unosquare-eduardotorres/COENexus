interface TokenExpirationWarningProps {
  minutesRemaining: number;
  isExpired: boolean;
  onRefreshToken: () => void;
  onDismiss: () => void;
  isSyncing: boolean;
}

export default function TokenExpirationWarning({
  minutesRemaining,
  isExpired,
  onRefreshToken,
  onDismiss,
  isSyncing,
}: TokenExpirationWarningProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={isExpired ? undefined : onDismiss} />

      <div className="glass-card relative z-10 w-full max-w-md mx-4 p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div
            className={`flex-shrink-0 p-2 rounded-xl ${
              isExpired
                ? 'bg-red-500/10 text-red-500'
                : 'bg-amber-500/10 text-amber-500'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isExpired ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              )}
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-primary">
              {isExpired ? 'Token Expired' : 'Token Expiring Soon'}
            </h3>
            <p className="text-sm text-muted mt-1">
              {isExpired
                ? 'Your SharePoint token has expired. You need to provide a new token to continue syncing data.'
                : `Your token will expire in approximately ${Math.ceil(minutesRemaining)} minute${Math.ceil(minutesRemaining) === 1 ? '' : 's'}. Consider refreshing it to avoid interruption.`}
            </p>
            {isSyncing && !isExpired && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                Refreshing the token will cancel the current sync operation.
              </p>
            )}
          </div>
        </div>

        <div className={`flex gap-3 ${isExpired ? 'justify-end' : 'justify-end'}`}>
          {!isExpired && (
            <button
              onClick={onDismiss}
              className="px-4 py-2 text-sm font-medium text-secondary rounded-xl border border-gray-200 dark:border-dark-border hover:bg-white/60 dark:hover:bg-dark-hover/60 transition-colors"
            >
              Continue Working
            </button>
          )}
          <button
            onClick={onRefreshToken}
            className={`px-4 py-2 text-sm font-medium text-white rounded-xl transition-colors ${
              isExpired
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-amber-500 hover:bg-amber-600'
            }`}
          >
            Refresh Token
          </button>
        </div>
      </div>
    </div>
  );
}
