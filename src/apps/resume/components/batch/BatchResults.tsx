import { BatchResult } from '../../types';

interface BatchResultsProps {
  results: BatchResult[];
  onReset: () => void;
}

export default function BatchResults({ results, onReset }: BatchResultsProps) {
  const successCount = results.filter((r) => r.status === 'success').length;
  const errorCount = results.filter((r) => r.status === 'error').length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-bold text-primary">{results.length}</div>
          <div className="text-xs text-muted mt-0.5">Total Processed</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{successCount}</div>
          <div className="text-xs text-muted mt-0.5">Succeeded</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className={`text-2xl font-bold ${errorCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-primary'}`}>
            {errorCount}
          </div>
          <div className="text-xs text-muted mt-0.5">Failed</div>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200/30 dark:border-dark-border/30">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">File Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Flow</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => (
              <tr
                key={result.id}
                className="border-b border-gray-200/20 dark:border-dark-border/20 last:border-0"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span className="text-sm text-primary truncate max-w-[200px]">{result.fileName}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {result.status === 'success' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Success
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400" title={result.error}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Error
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs font-medium text-secondary">
                    {result.flow === 'resume-processing' ? 'Resume Processing' : 'Data Extraction'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {result.status === 'success' && (
                    <div className="flex items-center justify-end gap-2">
                      <button className="px-2.5 py-1 text-xs font-medium text-accent-600 dark:text-accent-400 bg-accent-500/10 rounded-lg hover:bg-accent-500/20 transition-colors">
                        View
                      </button>
                      <button className="px-2.5 py-1 text-xs font-medium text-secondary bg-gray-100/50 dark:bg-dark-hover/50 rounded-lg hover:bg-gray-200/50 dark:hover:bg-dark-hover transition-colors">
                        Download
                      </button>
                    </div>
                  )}
                  {result.status === 'error' && (
                    <button className="px-2.5 py-1 text-xs font-medium text-red-600 dark:text-red-400 bg-red-500/10 rounded-lg hover:bg-red-500/20 transition-colors">
                      Retry
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={onReset}
        className="w-full py-3 px-6 bg-gradient-to-r from-accent-500 to-indigo-500 hover:from-accent-600 hover:to-indigo-600 text-white rounded-xl font-semibold text-sm transition-all duration-200"
      >
        Start New Batch
      </button>
    </div>
  );
}
