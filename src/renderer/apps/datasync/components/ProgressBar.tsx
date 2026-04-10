import { ProcessingProgress } from '../types';

interface ProgressBarProps {
  label: string;
  progress: ProcessingProgress;
  percent: number;
  dotColor: string;
  barGradient: string;
  textColor: string;
  onPause?: () => void;
  onResume?: () => void;
}

export default function ProgressBar({
  label,
  progress,
  percent,
  dotColor,
  barGradient,
  textColor,
  onPause,
  onResume,
}: ProgressBarProps) {
  return (
    <div className="glass-panel-subtle rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${dotColor} animate-pulse`} />
          <span className="text-sm font-medium text-secondary">
            {label} — {progress.processedRecords} / {progress.totalRecords}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-mono font-semibold ${textColor}`}>
            {percent}%
          </span>
          {progress.status === 'processing' && onPause ? (
            <button
              onClick={onPause}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/20 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-500/30 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
              Pause
            </button>
          ) : progress.status === 'paused' && onResume ? (
            <button
              onClick={onResume}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium ${textColor} bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors`}
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Resume
            </button>
          ) : null}
        </div>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-dark-border rounded-full overflow-hidden">
        <div
          className={`h-full ${barGradient} rounded-full transition-all duration-500`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {progress.currentRecord && (
        <p className="text-xs text-muted truncate" title={progress.currentRecord}>
          Processing "{progress.currentRecord}"
        </p>
      )}
    </div>
  );
}
