import { useState, useEffect, useRef } from 'react';
import { BatchConfig, BatchResult } from '../../types';
import { batchService } from '../../services/batchService';

interface BatchProgressProps {
  files: File[];
  config: BatchConfig;
  onComplete: (results: BatchResult[]) => void;
}

interface FileStatus {
  name: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  error?: string;
}

export default function BatchProgress({ files, config, onComplete }: BatchProgressProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentFileName, setCurrentFileName] = useState('');
  const [fileStatuses, setFileStatuses] = useState<FileStatus[]>(() =>
    files.map((f) => ({ name: f.name, status: 'pending' }))
  );
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    batchService
      .processFiles(files, config, (current, _total, fileName) => {
        setCurrentIndex(current);
        setCurrentFileName(fileName);
        setFileStatuses((prev) => {
          const next = [...prev];
          if (current > 1) {
            next[current - 2] = { ...next[current - 2], status: 'success' };
          }
          next[current - 1] = { ...next[current - 1], status: 'processing' };
          return next;
        });
      })
      .then((results) => {
        setFileStatuses(
          results.map((r) => ({
            name: r.fileName,
            status: r.status === 'success' ? 'success' : 'error',
            error: r.error,
          }))
        );
        setTimeout(() => onComplete(results), 600);
      });
  }, [files, config, onComplete]);

  const progressPercent = Math.round((currentIndex / files.length) * 100);

  return (
    <div className="space-y-4">
      <div className="glass-card border border-accent-500/20 bg-gradient-to-br from-accent-500/5 to-indigo-500/5 p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-2 h-2 rounded-full bg-accent-500 animate-pulse" />
          <h2 className="text-sm font-semibold text-primary">
            Processing {currentIndex} of {files.length}
          </h2>
        </div>

        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-gradient-to-r from-accent-500 to-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-secondary truncate mr-4">
            {currentFileName || 'Initializing...'}
          </span>
          <span className="text-sm font-mono text-accent-500 flex-shrink-0">{progressPercent}%</span>
        </div>
      </div>

      <div className="glass-card p-4">
        <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">File Status</div>
        <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
          {fileStatuses.map((file, index) => (
            <div
              key={index}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                file.status === 'processing'
                  ? 'bg-accent-500/5 border border-accent-500/10'
                  : 'bg-transparent'
              }`}
            >
              <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                {file.status === 'pending' && (
                  <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
                )}
                {file.status === 'processing' && (
                  <svg className="w-4 h-4 text-accent-500 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {file.status === 'success' && (
                  <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {file.status === 'error' && (
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <span
                className={`text-sm truncate flex-1 ${
                  file.status === 'processing'
                    ? 'text-primary font-medium'
                    : file.status === 'success'
                    ? 'text-secondary'
                    : file.status === 'error'
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-muted'
                }`}
              >
                {file.name}
              </span>
              {file.status === 'processing' && (
                <span className="text-[10px] font-mono text-accent-500">Processing…</span>
              )}
              {file.status === 'error' && file.error && (
                <span className="text-[10px] text-red-500 truncate max-w-[120px]" title={file.error}>
                  {file.error}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
