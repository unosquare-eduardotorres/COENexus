interface SearchProgressComponentProps {
  progress: { percent: number; stage: string };
}

export default function SearchProgress({ progress }: SearchProgressComponentProps) {
  return (
    <div className="glass-card border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-indigo-500/5 p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <h2 className="text-sm font-semibold text-primary">Searching...</h2>
      </div>

      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-indigo-500 rounded-full transition-all duration-500"
          style={{ width: `${progress.percent}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-secondary">{progress.stage}</span>
        <span className="text-sm font-mono text-emerald-500">{progress.percent}%</span>
      </div>
    </div>
  );
}
