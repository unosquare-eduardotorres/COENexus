import { ProcessingProgress } from '../types';

interface ProcessActionButtonsProps {
  progress?: ProcessingProgress;
  hasEligible: boolean;
  onStart?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  bgClass: string;
  hoverBgClass: string;
  gradientClass: string;
  label: string;
  icon: JSX.Element;
  disabled?: boolean;
  title?: string;
}

export default function ProcessActionButtons({
  progress,
  hasEligible,
  onStart,
  onPause,
  onResume,
  bgClass,
  hoverBgClass,
  gradientClass,
  label,
  icon,
  disabled,
  title,
}: ProcessActionButtonsProps) {
  const status = progress?.status ?? 'idle';
  const isRunning = status === 'processing';
  const isPaused = status === 'paused';
  const isCompleted = status === 'completed';
  const isAuthFailed = status === 'auth_failed';
  const isError = status === 'error' || isAuthFailed;
  const isIdle = status === 'idle';

  if (isRunning && onPause) {
    return (
      <button
        onClick={onPause}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors duration-200 font-semibold text-sm"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
        </svg>
        Pause
      </button>
    );
  }

  if (isPaused && onResume) {
    return (
      <button
        onClick={onResume}
        className={`inline-flex items-center gap-2 px-5 py-2.5 ${bgClass} text-white rounded-xl ${hoverBgClass} transition-colors duration-200 font-semibold text-sm`}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
        Resume
      </button>
    );
  }

  if (isError && onStart) {
    return (
      <div className="flex items-center gap-3">
        {isAuthFailed && (
          <span className="text-xs font-medium text-red-500 dark:text-red-400">
            Token expired or invalid
          </span>
        )}
        <button
          onClick={onStart}
          disabled={disabled}
          className={`inline-flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all duration-200 font-semibold text-sm ${
            disabled ? 'opacity-60 cursor-not-allowed' : ''
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Retry
        </button>
      </div>
    );
  }

  if (isCompleted && !hasEligible) {
    return (
      <span className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        All processed
      </span>
    );
  }

  if (isCompleted && hasEligible && onStart) {
    return (
      <button
        onClick={onStart}
        disabled={disabled}
        className={`inline-flex items-center gap-2 px-5 py-2.5 ${gradientClass} text-white rounded-xl transition-all duration-200 font-semibold text-sm ${
          disabled ? 'opacity-60 cursor-not-allowed' : ''
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        {label}
      </button>
    );
  }

  if (isIdle && hasEligible && onStart) {
    return (
      <button
        onClick={onStart}
        disabled={disabled}
        title={title}
        className={`inline-flex items-center gap-2 px-5 py-2.5 ${bgClass} text-white rounded-xl ${hoverBgClass} transition-colors duration-200 font-semibold text-sm ${
          disabled ? 'opacity-60 cursor-not-allowed' : ''
        }`}
      >
        {icon}
        {label}
      </button>
    );
  }

  return null;
}
