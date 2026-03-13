import { useState } from 'react';
import { ProcessingRecord, ProcessingRecordStatus } from '../../types';

interface ProcessingRecordTableProps {
  records: ProcessingRecord[];
}

const STATUS_LABELS: Record<ProcessingRecordStatus, string> = {
  pending: 'Pending',
  downloading: 'Downloading',
  extracting: 'Extracting',
  vectorizing: 'Vectorizing',
  completed: 'Completed',
  failed: 'Failed',
};

const STATUS_CLASSES: Record<ProcessingRecordStatus, string> = {
  pending: 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400',
  downloading: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 animate-pulse',
  extracting: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 animate-pulse',
  vectorizing: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400 animate-pulse',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
  failed: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
};

export default function ProcessingRecordTable({ records }: ProcessingRecordTableProps) {
  const [statusFilter, setStatusFilter] = useState<ProcessingRecordStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = records.filter((r) => {
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || r.name.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="glass-card overflow-x-auto">
      <div className="p-4 border-b border-gray-100 dark:border-dark-border/30 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name..."
            className="w-full pl-9 pr-4 py-2 bg-white/50 dark:bg-dark-hover/50 border border-gray-200 dark:border-dark-border rounded-xl text-sm text-primary placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-400/60 dark:focus:border-accent-500/40 transition-all duration-200"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ProcessingRecordStatus | 'all')}
          className="px-3 py-2 bg-white/50 dark:bg-dark-hover/50 border border-gray-200 dark:border-dark-border rounded-xl text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-400/60 dark:focus:border-accent-500/40 transition-all duration-200 cursor-pointer"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="downloading">Downloading</option>
          <option value="extracting">Extracting</option>
          <option value="vectorizing">Vectorizing</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <svg className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-medium text-primary">No records found</p>
          <p className="text-xs text-muted mt-1">Try adjusting your search or filter.</p>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-dark-border/30">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Name</th>
              <th className="hidden md:table-cell text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Resume Size</th>
              <th className="hidden md:table-cell text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Chunks</th>
              <th className="hidden md:table-cell text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Error</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-dark-border/20">
            {filtered.map((record) => (
              <tr
                key={record.id}
                className="hover:bg-gray-50 dark:hover:bg-dark-hover/30 transition-colors duration-150"
              >
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASSES[record.status]}`}>
                    {STATUS_LABELS[record.status]}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-primary whitespace-nowrap">{record.name}</td>
                <td className="hidden md:table-cell px-4 py-3 text-secondary">
                  {record.resumeSizeKb != null ? `${record.resumeSizeKb} KB` : '—'}
                </td>
                <td className="hidden md:table-cell px-4 py-3 text-secondary">
                  {record.extractedChunks != null ? record.extractedChunks : '—'}
                </td>
                <td className="hidden md:table-cell px-4 py-3">
                  {record.error ? (
                    <span className="inline-flex items-center px-2 py-0.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-full text-xs font-medium max-w-[200px] truncate">
                      {record.error}
                    </span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
