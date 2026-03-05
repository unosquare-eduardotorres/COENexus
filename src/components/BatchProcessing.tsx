import { useState, useCallback } from 'react';
import { BatchJob, BatchResumeItem } from '../types';
import FileUpload from './FileUpload';

interface BatchProcessingProps {
  onStartBatch: (files: File[], jobName: string) => void;
  batchJobs: BatchJob[];
  onViewResume: (resumeId: string) => void;
  onCancelJob: (jobId: string) => void;
}

export default function BatchProcessing({
  onStartBatch,
  batchJobs,
  onViewResume,
  onCancelJob,
}: BatchProcessingProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [jobName, setJobName] = useState('');
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');

  const handleFilesSelected = useCallback((files: File[]) => {
    setSelectedFiles(files);
  }, []);

  const handleStartBatch = useCallback(() => {
    if (selectedFiles.length === 0 || !jobName.trim()) return;
    onStartBatch(selectedFiles, jobName);
    setSelectedFiles([]);
    setJobName('');
    setActiveTab('history');
  }, [selectedFiles, jobName, onStartBatch]);

  const getStatusColor = (status: BatchJob['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-100/80 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400';
      case 'processing':
        return 'bg-accent-100/80 dark:bg-accent-500/20 text-accent-700 dark:text-accent-400';
      case 'failed':
        return 'bg-red-100/80 dark:bg-red-500/20 text-red-700 dark:text-red-400';
      case 'paused':
        return 'bg-amber-100/80 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400';
      default:
        return 'bg-gray-100/80 dark:bg-gray-500/20 text-gray-700 dark:text-gray-300';
    }
  };

  const getItemStatusIcon = (status: BatchResumeItem['status']) => {
    switch (status) {
      case 'completed':
        return (
          <svg className="w-3.5 h-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'processing':
        return (
          <svg
            className="w-3.5 h-3.5 text-accent-500 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        );
      case 'failed':
        return (
          <svg className="w-3.5 h-3.5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        );
      default:
        return (
          <svg className="w-3.5 h-3.5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
              clipRule="evenodd"
            />
          </svg>
        );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="glass-card overflow-hidden">
      <div className="border-b border-gray-200/30 dark:border-dark-border/30">
        <div className="flex">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 px-5 py-3 text-xs font-medium transition-colors ${
              activeTab === 'create'
                ? 'text-accent-600 dark:text-accent-400 border-b-2 border-accent-500 bg-accent-50/50 dark:bg-accent-500/10'
                : 'text-muted hover:text-secondary hover:bg-gray-50/50 dark:hover:bg-dark-hover/50'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              New Batch
            </div>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 px-5 py-3 text-xs font-medium transition-colors ${
              activeTab === 'history'
                ? 'text-accent-600 dark:text-accent-400 border-b-2 border-accent-500 bg-accent-50/50 dark:bg-accent-500/10'
                : 'text-muted hover:text-secondary hover:bg-gray-50/50 dark:hover:bg-dark-hover/50'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              History ({batchJobs.length})
            </div>
          </button>
        </div>
      </div>

      {activeTab === 'create' && (
        <div className="p-5">
          <div className="mb-5">
            <label className="block text-xs font-medium text-secondary mb-1.5">
              Batch Name
            </label>
            <input
              type="text"
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              placeholder="e.g., Q1 2024 Engineering Candidates"
              className="glass-input w-full px-3 py-2 text-sm"
            />
          </div>

          <div className="mb-5">
            <label className="block text-xs font-medium text-secondary mb-1.5">
              Upload Resumes
            </label>
            <FileUpload
              onFilesSelected={handleFilesSelected}
              multiple={true}
              maxFiles={50}
            />
          </div>

          {selectedFiles.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-accent-50/50 dark:bg-accent-500/10 rounded-xl mb-5 border border-accent-200/30 dark:border-accent-500/20">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-accent-100/80 dark:bg-accent-500/20 flex items-center justify-center">
                  <span className="text-accent-600 dark:text-accent-400 font-semibold text-sm">{selectedFiles.length}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-primary">
                    {selectedFiles.length} resume{selectedFiles.length !== 1 ? 's' : ''} ready
                  </p>
                  <p className="text-xs text-muted">
                    {(
                      selectedFiles.reduce((sum, f) => sum + f.size, 0) /
                      (1024 * 1024)
                    ).toFixed(2)}{' '}
                    MB total
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleStartBatch}
            disabled={selectedFiles.length === 0 || !jobName.trim()}
            className={`w-full py-2.5 px-5 rounded-xl text-sm font-medium transition-all ${
              selectedFiles.length === 0 || !jobName.trim()
                ? 'bg-gray-100/50 dark:bg-dark-hover/50 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'bg-accent-500 text-white hover:bg-accent-600 shadow-glass hover:shadow-glass-lg'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              Start Batch Processing
            </div>
          </button>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="divide-y divide-gray-200/30 dark:divide-dark-border/30">
          {batchJobs.length === 0 ? (
            <div className="p-10 text-center">
              <svg
                className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              <h3 className="text-sm font-medium text-secondary mb-0.5">No batch jobs yet</h3>
              <p className="text-xs text-muted">
                Create a new batch to process multiple resumes
              </p>
            </div>
          ) : (
            batchJobs.map((job) => (
              <div key={job.id} className="p-4 hover:bg-gray-50/30 dark:hover:bg-dark-hover/30 transition-colors">
                <div className="flex items-start justify-between mb-2.5">
                  <div>
                    <h4 className="text-sm font-medium text-primary">{job.name}</h4>
                    <p className="text-xs text-muted">{formatDate(job.createdAt)}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(
                      job.status
                    )}`}
                  >
                    {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                  </span>
                </div>

                <div className="mb-2.5">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted">Progress</span>
                    <span className="font-medium text-secondary">
                      {job.processedResumes} / {job.totalResumes}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100/50 dark:bg-dark-hover/50 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        job.status === 'completed'
                          ? 'bg-emerald-500'
                          : job.status === 'failed'
                          ? 'bg-red-500'
                          : 'bg-accent-500'
                      }`}
                      style={{
                        width: `${(job.processedResumes / job.totalResumes) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {job.successfulResumes} successful
                  </span>
                  {job.failedResumes > 0 && (
                    <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {job.failedResumes} failed
                    </span>
                  )}
                </div>

                {job.resumes.length > 0 && (
                  <div className="mt-3 border-t border-gray-100/50 dark:border-dark-border/30 pt-2.5">
                    <details className="group">
                      <summary className="flex items-center gap-1.5 cursor-pointer text-xs text-muted hover:text-secondary">
                        <svg
                          className="w-3.5 h-3.5 transition-transform group-open:rotate-90"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                        View files
                      </summary>
                      <div className="mt-2 space-y-1 pl-5">
                        {job.resumes.slice(0, 5).map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between py-0.5"
                          >
                            <div className="flex items-center gap-1.5">
                              {getItemStatusIcon(item.status)}
                              <span className="text-xs text-secondary truncate max-w-[180px]">
                                {item.fileName}
                              </span>
                            </div>
                            {item.resumeId && (
                              <button
                                onClick={() => onViewResume(item.resumeId!)}
                                className="text-[10px] text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 font-medium"
                              >
                                View
                              </button>
                            )}
                          </div>
                        ))}
                        {job.resumes.length > 5 && (
                          <p className="text-[10px] text-muted">
                            +{job.resumes.length - 5} more files
                          </p>
                        )}
                      </div>
                    </details>
                  </div>
                )}

                {job.status === 'processing' && (
                  <div className="mt-2.5 flex justify-end">
                    <button
                      onClick={() => onCancelJob(job.id)}
                      className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
