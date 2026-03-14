import { useState, useEffect, useMemo } from 'react';
import { SyncRecord, SyncSourceType, PipelineStatus } from '../../types';

const PAGE_SIZE = 50;

interface SyncRecordTableProps {
  records: SyncRecord[];
  source: SyncSourceType;
  statusFilter: PipelineStatus | 'all' | 'excluded';
  onRefreshRecord?: (upstreamId: number) => void;
  refreshingId?: number;
  onVectorizeRecord?: (upstreamId: number) => void;
  vectorizingId?: number;
  extractingUpstreamId?: number;
  vectorizingUpstreamId?: number;
}

const PIPELINE_LABELS: Record<PipelineStatus, string> = {
  'not-processed': 'Not Processed',
  incomplete: 'Incomplete',
  synced: 'Synced',
  extracted: 'Extracted',
  vectorized: 'Vectorized',
};

const PIPELINE_CLASSES: Record<PipelineStatus, string> = {
  'not-processed': 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
  incomplete: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  synced: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
  extracted: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
  vectorized: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400',
};

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function SpinnerIcon({ color }: { color: string }) {
  return (
    <svg className={`w-4 h-4 animate-spin ${color}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function RefreshIcon({ spinning }: { spinning?: boolean }) {
  return (
    <svg
      className={`w-3.5 h-3.5 ${spinning ? 'animate-spin' : ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

type SortKey = 'pipelineStatus' | 'name' | 'jobTitle' | 'email' | 'seniority' | 'mainSkill' | 'salary' | 'country' | 'hasResume' | 'reason' | 'coeCertified' | 'candidateStatus' | 'lastStatusUpdate' | 'salaryExpectations';
type SortDirection = 'asc' | 'desc';

const PIPELINE_ORDER: Record<PipelineStatus, number> = {
  'not-processed': 0,
  incomplete: 1,
  synced: 2,
  extracted: 3,
  vectorized: 4,
};

function SortIcon({ direction }: { direction?: SortDirection }) {
  if (!direction) {
    return (
      <svg className="w-3 h-3 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    );
  }
  return (
    <svg className="w-3 h-3 text-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {direction === 'asc' ? (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      )}
    </svg>
  );
}

function compareValues(a: string | number | boolean | null | undefined, b: string | number | boolean | null | undefined): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'boolean' && typeof b === 'boolean') return a === b ? 0 : a ? -1 : 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { sensitivity: 'base' });
}

export default function SyncRecordTable({
  records,
  source,
  statusFilter,
  onRefreshRecord,
  refreshingId,
  onVectorizeRecord,
  vectorizingId,
  extractingUpstreamId,
  vectorizingUpstreamId,
}: SyncRecordTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortKey(null);
        setSortDirection('asc');
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
    setPage(0);
  };

  useEffect(() => {
    setPage(0);
  }, [statusFilter, searchQuery, records]);

  const filtered = useMemo(() => {
    const base = records.filter((r) => {
      let matchesStatus = true;
      if (statusFilter === 'all') {
        matchesStatus = true;
      } else if (statusFilter === 'excluded') {
        matchesStatus = !r.hasResume;
      } else {
        matchesStatus = r.pipelineStatus === statusFilter;
      }
      const q = searchQuery.toLowerCase();
      const displayName = r.name || (r.email ? r.email.split('@')[0] : '');
      const matchesSearch = !q || displayName.toLowerCase().includes(q) || (r.email ?? '').toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });

    if (!sortKey) return base;

    return [...base].sort((a, b) => {
      let valA: string | number | boolean | null | undefined;
      let valB: string | number | boolean | null | undefined;

      switch (sortKey) {
        case 'pipelineStatus':
          valA = PIPELINE_ORDER[a.pipelineStatus];
          valB = PIPELINE_ORDER[b.pipelineStatus];
          break;
        case 'name':
          valA = a.name || a.email?.split('@')[0] || '';
          valB = b.name || b.email?.split('@')[0] || '';
          break;
        case 'jobTitle':
          valA = a.jobTitle;
          valB = b.jobTitle;
          break;
        case 'email':
          valA = a.email;
          valB = b.email;
          break;
        case 'seniority':
          valA = a.seniority;
          valB = b.seniority;
          break;
        case 'mainSkill':
          valA = a.mainSkill;
          valB = b.mainSkill;
          break;
        case 'salary':
          valA = a.grossMonthlySalary ?? null;
          valB = b.grossMonthlySalary ?? null;
          break;
        case 'country':
          valA = a.country;
          valB = b.country;
          break;
        case 'hasResume':
          valA = a.hasResume;
          valB = b.hasResume;
          break;
        case 'coeCertified':
          valA = a.coeCertified ?? null;
          valB = b.coeCertified ?? null;
          break;
        case 'candidateStatus':
          valA = a.candidateStatus ?? null;
          valB = b.candidateStatus ?? null;
          break;
        case 'lastStatusUpdate':
          valA = a.lastStatusUpdate ?? null;
          valB = b.lastStatusUpdate ?? null;
          break;
        case 'salaryExpectations':
          valA = a.salaryExpectations ?? null;
          valB = b.salaryExpectations ?? null;
          break;
        case 'reason':
          valA = a.syncDetail || a.reason || null;
          valB = b.syncDetail || b.reason || null;
          break;
      }

      const result = compareValues(valA, valB);
      return sortDirection === 'asc' ? result : -result;
    });
  }, [records, statusFilter, searchQuery, sortKey, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginatedRecords = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : page * PAGE_SIZE + 1;
  const rangeEnd = Math.min((page + 1) * PAGE_SIZE, filtered.length);

  return (
    <div className="glass-card overflow-x-auto">
      <div className="p-4 border-b border-gray-100 dark:border-dark-border/30">
        <div className="relative">
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
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-4 py-2 bg-white/50 dark:bg-dark-hover/50 border border-gray-200 dark:border-dark-border rounded-xl text-sm text-primary placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-400/60 dark:focus:border-accent-500/40 transition-all duration-200"
          />
        </div>
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
        <>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-dark-border/30">
                {(source === 'candidates' ? [
                  { key: 'pipelineStatus' as SortKey, label: 'Status', className: '' },
                  { key: 'name' as SortKey, label: 'Candidate', className: '' },
                  { key: 'coeCertified' as SortKey, label: 'COE Certified', className: 'hidden md:table-cell' },
                  { key: 'email' as SortKey, label: 'Email', className: 'hidden md:table-cell' },
                  { key: 'mainSkill' as SortKey, label: 'Main Skill', className: 'hidden md:table-cell' },
                  { key: 'candidateStatus' as SortKey, label: 'Cand. Status', className: 'hidden lg:table-cell' },
                  { key: 'lastStatusUpdate' as SortKey, label: 'Last Status', className: 'hidden lg:table-cell' },
                  { key: 'salaryExpectations' as SortKey, label: 'Salary Exp.', className: '' },
                  { key: 'country' as SortKey, label: 'Country', className: 'hidden lg:table-cell' },
                  { key: 'hasResume' as SortKey, label: 'Resume', className: '' },
                ] : [
                  { key: 'pipelineStatus' as SortKey, label: 'Status', className: '' },
                  { key: 'name' as SortKey, label: 'Name', className: '' },
                  { key: 'jobTitle' as SortKey, label: 'Job Title', className: 'hidden md:table-cell' },
                  { key: 'email' as SortKey, label: 'Email', className: 'hidden md:table-cell' },
                  { key: 'seniority' as SortKey, label: 'Seniority', className: 'hidden lg:table-cell' },
                  { key: 'mainSkill' as SortKey, label: 'Main Skill', className: 'hidden md:table-cell' },
                  { key: 'salary' as SortKey, label: 'Salary', className: '' },
                  { key: 'country' as SortKey, label: 'Country', className: 'hidden lg:table-cell' },
                  { key: 'hasResume' as SortKey, label: 'Resume', className: '' },
                ]).map(({ key, label, className }) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    className={`${className} text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider cursor-pointer select-none group hover:text-secondary transition-colors`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {label}
                      <SortIcon direction={sortKey === key ? sortDirection : undefined} />
                    </span>
                  </th>
                ))}
                <th className="hidden md:table-cell text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Pipeline</th>
                <th
                  onClick={() => handleSort('reason')}
                  className="hidden lg:table-cell text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider cursor-pointer select-none group hover:text-secondary transition-colors"
                >
                  <span className="inline-flex items-center gap-1.5">
                    Reason
                    <SortIcon direction={sortKey === 'reason' ? sortDirection : undefined} />
                  </span>
                </th>
                {onRefreshRecord && (
                  <th className="sticky right-0 bg-white dark:bg-dark-surface text-center px-3 py-3 text-xs font-semibold text-muted uppercase tracking-wider w-16 border-l border-gray-100 dark:border-dark-border/30">
                    Sync
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-dark-border/20">
              {paginatedRecords.map((record) => (
                <tr
                  key={record.id}
                  className="hover:bg-gray-50 dark:hover:bg-dark-hover/30 transition-colors duration-150"
                >
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${PIPELINE_CLASSES[record.pipelineStatus]}`}>
                      {PIPELINE_LABELS[record.pipelineStatus]}
                      {record.failed && (
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">
                    {record.name ? (
                      <span className="text-primary">{record.name}</span>
                    ) : record.email ? (
                      <span className="text-secondary italic">{record.email.split('@')[0]}</span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  {source === 'candidates' ? (
                    <>
                      <td className="hidden md:table-cell px-4 py-3">
                        {record.coeCertified ? <CheckIcon /> : <XIcon />}
                      </td>
                      <td className="hidden md:table-cell px-4 py-3 text-secondary">{record.email || '—'}</td>
                      <td className="hidden md:table-cell px-4 py-3 text-secondary">{record.mainSkill || '—'}</td>
                      <td className="hidden lg:table-cell px-4 py-3 text-secondary">{record.candidateStatus || '—'}</td>
                      <td className="hidden lg:table-cell px-4 py-3 text-secondary whitespace-nowrap">
                        {record.lastStatusUpdate
                          ? new Date(record.lastStatusUpdate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-secondary whitespace-nowrap">
                        {record.salaryExpectations != null
                          ? `${record.salaryExpectationsCurrency ?? 'USD'} ${record.salaryExpectations.toLocaleString()}`
                          : '—'}
                      </td>
                      <td className="hidden lg:table-cell px-4 py-3 text-secondary">{record.country || '—'}</td>
                    </>
                  ) : (
                    <>
                      <td className="hidden md:table-cell px-4 py-3 text-secondary whitespace-nowrap">{record.jobTitle || '—'}</td>
                      <td className="hidden md:table-cell px-4 py-3 text-secondary">{record.email || '—'}</td>
                      <td className="hidden lg:table-cell px-4 py-3 text-secondary">{record.seniority || '—'}</td>
                      <td className="hidden md:table-cell px-4 py-3 text-secondary">{record.mainSkill || '—'}</td>
                      <td className="px-4 py-3 text-secondary whitespace-nowrap">
                        {record.grossMonthlySalary != null && record.currency
                          ? `${record.currency} ${record.grossMonthlySalary.toLocaleString()}`
                          : '—'}
                      </td>
                      <td className="hidden lg:table-cell px-4 py-3 text-secondary">{record.country || '—'}</td>
                    </>
                  )}
                  <td className="px-4 py-3">
                    {record.hasResume ? (
                      <span className="inline-flex items-center gap-1.5">
                        <CheckIcon />
                        {record.resumeFilename && (
                          <span className="text-xs text-accent-500 truncate max-w-[120px]" title={record.resumeFilename}>
                            {record.resumeFilename}
                          </span>
                        )}
                      </span>
                    ) : <XIcon />}
                  </td>
                  <td className="hidden md:table-cell px-4 py-3">
                    {extractingUpstreamId === record.upstreamId ? (
                      <SpinnerIcon color="text-blue-500" />
                    ) : vectorizingUpstreamId === record.upstreamId ? (
                      <SpinnerIcon color="text-violet-500" />
                    ) : record.pipelineStatus === 'extracted' && !record.failed && onVectorizeRecord ? (
                      <button
                        onClick={() => onVectorizeRecord(record.upstreamId)}
                        disabled={vectorizingId === record.upstreamId}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-violet-400 hover:text-violet-500 hover:bg-violet-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Vectorize this resume"
                      >
                        {vectorizingId === record.upstreamId ? (
                          <SpinnerIcon color="text-violet-500" />
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        )}
                      </button>
                    ) : (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PIPELINE_CLASSES[record.pipelineStatus]}`}>
                        {PIPELINE_LABELS[record.pipelineStatus]}
                      </span>
                    )}
                  </td>
                  <td className="hidden lg:table-cell px-4 py-3">
                    {(record.syncDetail || record.reason) ? (
                      <span className="text-xs text-gray-600 dark:text-gray-400 max-w-[200px] block truncate" title={record.syncDetail || record.reason}>
                        {record.syncDetail || record.reason}
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  {onRefreshRecord && (
                    <td className="sticky right-0 bg-white dark:bg-dark-surface px-4 py-3 text-center border-l border-gray-100 dark:border-dark-border/30">
                      <button
                        onClick={() => onRefreshRecord(record.upstreamId)}
                        disabled={refreshingId === record.upstreamId}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-accent-500 hover:bg-accent-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Sync this record"
                      >
                        <RefreshIcon spinning={refreshingId === record.upstreamId} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="px-4 py-3 border-t border-gray-100 dark:border-dark-border/30 flex items-center justify-between">
            <span className="text-xs text-muted">
              Showing {rangeStart}–{rangeEnd} of {filtered.length.toLocaleString()} records
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-secondary bg-white/50 dark:bg-dark-hover/50 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ‹ Prev
              </button>
              <span className="text-xs font-medium text-secondary px-2">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-secondary bg-white/50 dark:bg-dark-hover/50 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next ›
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
