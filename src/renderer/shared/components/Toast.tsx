export type ToastSeverity = 'success' | 'warning' | 'error' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: number;
  message: string;
  severity: ToastSeverity;
  isVisible: boolean;
  actions?: ToastAction[];
}

interface ToastProps extends ToastItem {
  onDismiss: (id: number) => void;
}

const severityStyles: Record<
  ToastSeverity,
  { iconBg: string; iconText: string; border: string; accent: string }
> = {
  success: {
    iconBg: 'bg-emerald-100/80 dark:bg-emerald-500/20',
    iconText: 'text-emerald-600 dark:text-emerald-300',
    border: 'border-emerald-200/60 dark:border-emerald-500/30',
    accent: 'bg-emerald-400/80 dark:bg-emerald-400/70',
  },
  warning: {
    iconBg: 'bg-amber-100/80 dark:bg-amber-500/20',
    iconText: 'text-amber-600 dark:text-amber-300',
    border: 'border-amber-200/60 dark:border-amber-500/30',
    accent: 'bg-amber-400/80 dark:bg-amber-400/70',
  },
  error: {
    iconBg: 'bg-red-100/80 dark:bg-red-500/20',
    iconText: 'text-red-600 dark:text-red-300',
    border: 'border-red-200/60 dark:border-red-500/30',
    accent: 'bg-red-400/80 dark:bg-red-400/70',
  },
  info: {
    iconBg: 'bg-blue-100/80 dark:bg-blue-500/20',
    iconText: 'text-blue-600 dark:text-blue-300',
    border: 'border-blue-200/60 dark:border-blue-500/30',
    accent: 'bg-blue-400/80 dark:bg-blue-400/70',
  },
};

function SeverityIcon({ severity }: { severity: ToastSeverity }) {
  switch (severity) {
    case 'success':
      return (
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M16.704 5.29a1 1 0 010 1.42l-7 7a1 1 0 01-1.42 0l-3-3a1 1 0 111.42-1.42l2.29 2.29 6.29-6.29a1 1 0 011.42 0z"
            clipRule="evenodd"
          />
        </svg>
      );
    case 'warning':
      return (
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.72-1.36 3.486 0l5.58 9.923c.75 1.334-.213 2.978-1.742 2.978H4.42c-1.53 0-2.492-1.644-1.742-2.978l5.58-9.923zM11 13a1 1 0 10-2 0 1 1 0 002 0zm-1-7a1 1 0 00-1 1v4a1 1 0 102 0V7a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      );
    case 'error':
      return (
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-10.293a1 1 0 00-1.414-1.414L10 8.586 7.707 6.293a1 1 0 00-1.414 1.414L8.586 10l-2.293 2.293a1 1 0 101.414 1.414L10 11.414l2.293 2.293a1 1 0 001.414-1.414L11.414 10l2.293-2.293z"
            clipRule="evenodd"
          />
        </svg>
      );
    case 'info':
    default:
      return (
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M18 10A8 8 0 112 10a8 8 0 0116 0zm-9-3a1 1 0 102 0 1 1 0 00-2 0zm2 8a1 1 0 11-2 0V9a1 1 0 012 0v6z"
            clipRule="evenodd"
          />
        </svg>
      );
  }
}

export default function Toast({ id, message, severity, isVisible, onDismiss, actions }: ToastProps) {
  const styles = severityStyles[severity];
  const ariaRole = severity === 'error' ? 'alert' : 'status';
  const ariaLive = severity === 'error' ? 'assertive' : 'polite';

  return (
    <div
      role={ariaRole}
      aria-live={ariaLive}
      className={`glass-card pointer-events-auto w-full rounded-2xl border p-4 shadow-lg backdrop-blur-xl transition-all duration-300 ease-out ${styles.border} ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${styles.iconBg} ${styles.iconText}`}
        >
          <SeverityIcon severity={severity} />
        </div>
        <p className="flex-1 text-sm font-medium leading-relaxed text-primary">{message}</p>
        <button
          type="button"
          onClick={() => onDismiss(id)}
          className="rounded-lg p-1 text-muted transition-colors hover:bg-white/40 hover:text-primary dark:hover:bg-dark-hover/60"
          aria-label="Dismiss notification"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
      {actions && actions.length > 0 && (
        <div className="mt-2 flex gap-2 border-t border-white/5 pt-2">
          {actions.map((action, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { action.onClick(); onDismiss(id); }}
              className="text-xs font-medium text-accent-400 hover:text-accent-300 transition-colors"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
      <div className={`mt-3 h-1 rounded-full ${styles.accent}`} />
    </div>
  );
}
