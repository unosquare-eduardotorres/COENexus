interface ErrorBannerProps {
  message: string;
  severity: 'error' | 'warning' | 'info';
  onDismiss?: () => void;
}

const severityStyles = {
  error: {
    container: 'border-red-300/60 bg-red-500/10 dark:border-red-500/40 dark:bg-red-500/15',
    icon: 'text-red-600 dark:text-red-400',
    iconBackground: 'bg-red-500/15',
  },
  warning: {
    container:
      'border-amber-300/60 bg-amber-500/10 dark:border-amber-500/40 dark:bg-amber-500/15',
    icon: 'text-amber-600 dark:text-amber-400',
    iconBackground: 'bg-amber-500/15',
  },
  info: {
    container: 'border-blue-300/60 bg-blue-500/10 dark:border-blue-500/40 dark:bg-blue-500/15',
    icon: 'text-blue-600 dark:text-blue-400',
    iconBackground: 'bg-blue-500/15',
  },
} as const;

export default function ErrorBanner({ message, severity, onDismiss }: ErrorBannerProps) {
  const style = severityStyles[severity];

  return (
    <div
      role={severity === 'info' ? 'status' : 'alert'}
      className={`glass-panel border rounded-xl px-4 py-3 ${style.container}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${style.iconBackground} ${style.icon}`}
          aria-hidden="true"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {severity === 'error' ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v4m0 4h.01M5.072 19h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            ) : severity === 'warning' ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M3.34 16L10.268 4c.77-1.333 2.694-1.333 3.464 0L20.66 16c.77 1.333-.192 3-1.732 3H5.072c-1.54 0-2.502-1.667-1.732-3z"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            )}
          </svg>
        </span>

        <p className="flex-1 text-sm text-secondary">{message}</p>

        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss banner"
            className="glass-button flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:text-primary"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        ) : null}
      </div>
    </div>
  );
}
