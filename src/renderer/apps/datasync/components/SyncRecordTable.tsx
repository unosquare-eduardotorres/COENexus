import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { SyncRecord, SyncSourceType, PipelineStatus } from '../types';
import { formatSalary } from '../../resume/utils/formatSalary';
import { exportToExcel, ColumnDef } from '../../resume/utils/exportToExcel';
import ErrorDetailModal from './ErrorDetailModal';
import { CheckIcon, ChevronIcon, CloseIcon, DocumentIcon, SearchIcon, SpinnerIcon } from '../../../shared/components/icons';
import { useToast } from '../../../shared/components/ToastContext';

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
  sync_failed: 'Sync Failed',
  extract_failed: 'Extract Failed',
  vectorize_failed: 'Vectorize Failed',
};

const PIPELINE_CLASSES: Record<PipelineStatus, string> = {
  'not-processed': 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
  incomplete: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  synced: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
  extracted: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
  vectorized: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400',
  sync_failed: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400',
  extract_failed: 'bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-400',
  vectorize_failed: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-400',
};

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

function displayReason(record: SyncRecord): string {
  if (record.pipelineStatus.endsWith('_failed') && record.reason) {
    return record.reason;
  }
  const detail = record.syncDetail && record.syncDetail !== 'error' ? record.syncDetail : '';
  return detail || record.reason || '';
}

function simplifiedStatus(status: PipelineStatus): 'Succeeded' | 'Failed' | 'Skip' {
  if (status === 'sync_failed' || status === 'extract_failed' || status === 'vectorize_failed') return 'Failed';
  if (status === 'incomplete' || status === 'not-processed') return 'Skip';
  return 'Succeeded';
}

type SortKey = 'pipelineStatus' | 'name' | 'jobTitle' | 'email' | 'seniority' | 'mainSkill' | 'functionalUnit' | 'officeLocation' | 'businessUnit' | 'salary' | 'country' | 'hasResume' | 'reason' | 'coeCertified' | 'candidateStatus' | 'lastStatusUpdate' | 'salaryExpectations' | 'account' | 'coe' | 'stakeholder' | 'countries' | 'seniorities' | 'aging' | 'hasJobDescription' | 'candidatesCount' | 'team' | 'transitionStatus' | 'location' | 'impact' | 'attritionRisk' | 'presentationsCount';
type SortDirection = 'asc' | 'desc';

const PIPELINE_ORDER: Record<PipelineStatus, number> = {
  'not-processed': 0,
  incomplete: 1,
  synced: 2,
  extracted: 3,
  vectorized: 4,
  sync_failed: 5,
  extract_failed: 6,
  vectorize_failed: 7,
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
    <ChevronIcon
      size="sm"
      direction={direction === 'asc' ? 'up' : 'down'}
      className="w-3 h-3 text-accent-500"
    />
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

const SyncRecordTable = memo(function SyncRecordTable({
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
  const [errorDetail, setErrorDetail] = useState<{ name: string; error: string } | null>(null);
  const [exporting, setExporting] = useState(false);
  const { showToast } = useToast();

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
        matchesStatus = source === 'open-positions' ? !r.hasJobDescription : !r.hasResume;
      } else {
        matchesStatus = r.pipelineStatus === statusFilter;
      }
      const q = searchQuery.toLowerCase();
      const displayName = r.name || (r.email ? r.email.split('@')[0] : '');
      const matchesSearch = !q
        || displayName.toLowerCase().includes(q)
        || (r.email ?? '').toLowerCase().includes(q)
        || (r.account ?? '').toLowerCase().includes(q)
        || (source === 'employees' && (
          (r.mainSkill ?? '').toLowerCase().includes(q)
          || (r.functionalUnit ?? '').toLowerCase().includes(q)
          || (r.businessUnit ?? '').toLowerCase().includes(q)
          || (r.officeLocation ?? '').toLowerCase().includes(q)
        ));
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
        case 'functionalUnit':
          valA = a.functionalUnit;
          valB = b.functionalUnit;
          break;
        case 'officeLocation':
          valA = a.officeLocation;
          valB = b.officeLocation;
          break;
        case 'businessUnit':
          valA = a.businessUnit;
          valB = b.businessUnit;
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
          valA = displayReason(a) || null;
          valB = displayReason(b) || null;
          break;
        case 'account':
          valA = a.account;
          valB = b.account;
          break;
        case 'coe':
          valA = a.coe;
          valB = b.coe;
          break;
        case 'stakeholder':
          valA = a.stakeholder;
          valB = b.stakeholder;
          break;
        case 'countries':
          valA = a.countries;
          valB = b.countries;
          break;
        case 'seniorities':
          valA = a.seniorities;
          valB = b.seniorities;
          break;
        case 'aging':
          valA = a.aging ?? null;
          valB = b.aging ?? null;
          break;
        case 'hasJobDescription':
          valA = a.hasJobDescription ?? false;
          valB = b.hasJobDescription ?? false;
          break;
        case 'candidatesCount':
          valA = a.candidatesCount ?? 0;
          valB = b.candidatesCount ?? 0;
          break;
        case 'team':
          valA = a.team;
          valB = b.team;
          break;
        case 'transitionStatus':
          valA = a.transitionStatus;
          valB = b.transitionStatus;
          break;
        case 'location':
          valA = a.location;
          valB = b.location;
          break;
        case 'impact':
          valA = a.impact;
          valB = b.impact;
          break;
        case 'attritionRisk':
          valA = a.attritionRisk;
          valB = b.attritionRisk;
          break;
        case 'presentationsCount':
          valA = a.presentationsCount ?? 0;
          valB = b.presentationsCount ?? 0;
          break;
      }

      const result = compareValues(valA, valB);
      return sortDirection === 'asc' ? result : -result;
    });
  }, [records, statusFilter, searchQuery, sortKey, sortDirection]);

  const handleExport = useCallback(async () => {
    if (exporting || filtered.length === 0) return;
    setExporting(true);
    try {
      const candidateColumns: ColumnDef[] = [
        { header: 'Pipeline Status', accessor: (r) => PIPELINE_LABELS[(r as unknown as SyncRecord).pipelineStatus] },
        { header: 'Name', accessor: (r) => (r as unknown as SyncRecord).name || (r as unknown as SyncRecord).email?.split('@')[0] || '' },
        { header: 'COE Certified', accessor: (r) => (r as unknown as SyncRecord).coeCertified ?? false },
        { header: 'Email', accessor: (r) => (r as unknown as SyncRecord).email },
        { header: 'Main Skill', accessor: (r) => (r as unknown as SyncRecord).mainSkill },
        { header: 'Candidate Status', accessor: (r) => (r as unknown as SyncRecord).candidateStatus },
        { header: 'Last Status Update', accessor: (r) => {
          const d = (r as unknown as SyncRecord).lastStatusUpdate;
          return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
        }},
        { header: 'Current Salary', accessor: (r) => (r as unknown as SyncRecord).grossMonthlySalary },
        { header: 'Current Salary Currency', accessor: (r) => (r as unknown as SyncRecord).currency },
        { header: 'Salary Expectations', accessor: (r) => (r as unknown as SyncRecord).salaryExpectations },
        { header: 'Salary Exp. Currency', accessor: (r) => (r as unknown as SyncRecord).salaryExpectationsCurrency },
        { header: 'Country', accessor: (r) => (r as unknown as SyncRecord).country },
        { header: 'Has Resume', accessor: (r) => (r as unknown as SyncRecord).hasResume },
        { header: 'Reason', accessor: (r) => displayReason(r as unknown as SyncRecord) },
      ];

      const employeeColumns: ColumnDef[] = [
        { header: 'Status', accessor: (r) => simplifiedStatus((r as unknown as SyncRecord).pipelineStatus) },
        { header: 'Pipeline Status', accessor: (r) => PIPELINE_LABELS[(r as unknown as SyncRecord).pipelineStatus] },
        { header: 'Name', accessor: (r) => (r as unknown as SyncRecord).name || (r as unknown as SyncRecord).email?.split('@')[0] || '' },
        { header: 'Main Skill', accessor: (r) => (r as unknown as SyncRecord).mainSkill },
        { header: 'Functional Unit', accessor: (r) => (r as unknown as SyncRecord).functionalUnit ?? '' },
        { header: 'Office Location', accessor: (r) => (r as unknown as SyncRecord).officeLocation ?? '' },
        { header: 'Business Unit', accessor: (r) => (r as unknown as SyncRecord).businessUnit ?? '' },
        { header: 'Job Title', accessor: (r) => (r as unknown as SyncRecord).jobTitle },
        { header: 'Email', accessor: (r) => (r as unknown as SyncRecord).email },
        { header: 'Seniority', accessor: (r) => (r as unknown as SyncRecord).seniority },
        { header: 'Salary', accessor: (r) => (r as unknown as SyncRecord).grossMonthlySalary },
        { header: 'Currency', accessor: (r) => (r as unknown as SyncRecord).currency },
        { header: 'Country', accessor: (r) => (r as unknown as SyncRecord).country },
        { header: 'Has Resume', accessor: (r) => (r as unknown as SyncRecord).hasResume },
        { header: 'Reason', accessor: (r) => displayReason(r as unknown as SyncRecord) },
      ];

      const openPositionColumns: ColumnDef[] = [
        { header: 'Pipeline Status', accessor: (r) => PIPELINE_LABELS[(r as unknown as SyncRecord).pipelineStatus] },
        { header: 'Position', accessor: (r) => (r as unknown as SyncRecord).name || '' },
        { header: 'Account', accessor: (r) => (r as unknown as SyncRecord).account },
        { header: 'Main Skill', accessor: (r) => (r as unknown as SyncRecord).mainSkill },
        { header: 'CoE', accessor: (r) => (r as unknown as SyncRecord).coe },
        { header: 'Stakeholder', accessor: (r) => (r as unknown as SyncRecord).stakeholder },
        { header: 'Countries', accessor: (r) => (r as unknown as SyncRecord).countries },
        { header: 'Seniorities', accessor: (r) => (r as unknown as SyncRecord).seniorities },
        { header: 'Has JD', accessor: (r) => (r as unknown as SyncRecord).hasJobDescription ?? false },
        { header: 'Candidates', accessor: (r) => (r as unknown as SyncRecord).candidatesCount ?? 0 },
        { header: 'Reason', accessor: (r) => displayReason(r as unknown as SyncRecord) },
      ];

      const prrColumns: ColumnDef[] = [
        { header: 'Pipeline Status', accessor: (r) => PIPELINE_LABELS[(r as unknown as SyncRecord).pipelineStatus] },
        { header: 'Employee', accessor: (r) => (r as unknown as SyncRecord).name || '' },
        { header: 'Client', accessor: (r) => (r as unknown as SyncRecord).account },
        { header: 'Team', accessor: (r) => (r as unknown as SyncRecord).team },
        { header: 'Main Skill', accessor: (r) => (r as unknown as SyncRecord).mainSkill },
        { header: 'Seniority', accessor: (r) => (r as unknown as SyncRecord).seniority },
        { header: 'PRR Status', accessor: (r) => (r as unknown as SyncRecord).transitionStatus },
        { header: 'Location', accessor: (r) => (r as unknown as SyncRecord).location },
        { header: 'Impact', accessor: (r) => (r as unknown as SyncRecord).impact },
        { header: 'Attrition Risk', accessor: (r) => (r as unknown as SyncRecord).attritionRisk },
        { header: 'Presentations', accessor: (r) => (r as unknown as SyncRecord).presentationsCount ?? 0 },
        { header: 'Reason', accessor: (r) => displayReason(r as unknown as SyncRecord) },
      ];

      const columns = source === 'project-reallocations' ? prrColumns : source === 'open-positions' ? openPositionColumns : source === 'candidates' ? candidateColumns : employeeColumns;
      const statusLabel = statusFilter === 'all' ? 'All' : statusFilter === 'excluded' ? 'Excluded' : PIPELINE_LABELS[statusFilter as PipelineStatus] ?? statusFilter;
      const filename = `${source}-${statusLabel}-${new Date().toISOString().slice(0, 10)}`;
      await exportToExcel(filtered as unknown as Record<string, unknown>[], columns, filename);
      showToast(`${filtered.length} records exported to Excel`, 'success');
    } finally {
      setExporting(false);
    }
  }, [filtered, source, statusFilter, exporting]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginatedRecords = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : page * PAGE_SIZE + 1;
  const rangeEnd = Math.min((page + 1) * PAGE_SIZE, filtered.length);

  return (
    <div className="glass-card overflow-x-auto">
      <div className="p-4 border-b border-gray-100 dark:border-dark-border/30">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <SearchIcon size="sm" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={source === 'open-positions' ? 'Search by position or account...' : source === 'project-reallocations' ? 'Search by employee or account...' : 'Search by name or email...'}
              aria-label={source === 'open-positions' ? 'Search records by position or account' : source === 'project-reallocations' ? 'Search records by employee or account' : 'Search records by name or email'}
              className="w-full pl-9 pr-4 py-2 bg-white/50 dark:bg-dark-hover/50 border border-gray-200 dark:border-dark-border rounded-xl text-sm text-primary placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-400/60 dark:focus:border-accent-500/40 transition-all duration-200"
            />
          </div>
          <button
            onClick={handleExport}
            disabled={exporting || filtered.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-secondary bg-white/50 dark:bg-dark-hover/50 border border-gray-200 dark:border-dark-border rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-300 dark:hover:border-emerald-500/30 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            title={`Export ${filtered.length} records to Excel`}
          >
            {exporting ? (
              <SpinnerIcon size="sm" />
            ) : (
              <DocumentIcon size="sm" />
            )}
            Export
          </button>
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
                {(source === 'project-reallocations' ? [
                  { key: 'pipelineStatus' as SortKey, label: 'Status', className: '' },
                  { key: 'name' as SortKey, label: 'Employee', className: '' },
                  { key: 'account' as SortKey, label: 'Client', className: 'hidden md:table-cell' },
                  { key: 'team' as SortKey, label: 'Team', className: 'hidden lg:table-cell' },
                  { key: 'mainSkill' as SortKey, label: 'Main Skill', className: 'hidden md:table-cell' },
                  { key: 'seniority' as SortKey, label: 'Seniority', className: 'hidden lg:table-cell' },
                  { key: 'transitionStatus' as SortKey, label: 'PRR Status', className: 'hidden md:table-cell' },
                  { key: 'location' as SortKey, label: 'Location', className: 'hidden lg:table-cell' },
                  { key: 'impact' as SortKey, label: 'Impact', className: 'hidden lg:table-cell' },
                  { key: 'attritionRisk' as SortKey, label: 'Attrition Risk', className: 'hidden lg:table-cell' },
                  { key: 'presentationsCount' as SortKey, label: 'Presentations', className: '' },
                ] : source === 'open-positions' ? [
                  { key: 'pipelineStatus' as SortKey, label: 'Status', className: '' },
                  { key: 'name' as SortKey, label: 'Position', className: '' },
                  { key: 'account' as SortKey, label: 'Account', className: 'hidden md:table-cell' },
                  { key: 'mainSkill' as SortKey, label: 'Main Skill', className: 'hidden md:table-cell' },
                  { key: 'coe' as SortKey, label: 'CoE', className: 'hidden lg:table-cell' },
                  { key: 'stakeholder' as SortKey, label: 'Stakeholder', className: 'hidden lg:table-cell' },
                  { key: 'countries' as SortKey, label: 'Countries', className: 'hidden lg:table-cell' },
                  { key: 'seniorities' as SortKey, label: 'Seniorities', className: 'hidden lg:table-cell' },
                  { key: 'hasJobDescription' as SortKey, label: 'JD', className: '' },
                  { key: 'candidatesCount' as SortKey, label: 'Candidates', className: '' },
                ] : source === 'candidates' ? [
                  { key: 'pipelineStatus' as SortKey, label: 'Status', className: '' },
                  { key: 'name' as SortKey, label: 'Candidate', className: '' },
                  { key: 'coeCertified' as SortKey, label: 'COE Certified', className: 'hidden md:table-cell' },
                  { key: 'email' as SortKey, label: 'Email', className: 'hidden md:table-cell' },
                  { key: 'mainSkill' as SortKey, label: 'Main Skill', className: 'hidden md:table-cell' },
                  { key: 'candidateStatus' as SortKey, label: 'Cand. Status', className: 'hidden lg:table-cell' },
                  { key: 'lastStatusUpdate' as SortKey, label: 'Last Status', className: 'hidden lg:table-cell' },
                  { key: 'salary' as SortKey, label: 'Current Salary', className: 'hidden lg:table-cell' },
                  { key: 'salaryExpectations' as SortKey, label: 'Salary Exp.', className: '' },
                  { key: 'country' as SortKey, label: 'Country', className: 'hidden lg:table-cell' },
                  { key: 'hasResume' as SortKey, label: 'Resume', className: '' },
                ] : [
                  { key: 'pipelineStatus' as SortKey, label: 'Status', className: '' },
                  { key: 'name' as SortKey, label: 'Name', className: '' },
                  { key: 'mainSkill' as SortKey, label: 'Main Skill', className: 'hidden md:table-cell' },
                  { key: 'functionalUnit' as SortKey, label: 'Functional Unit', className: 'hidden md:table-cell' },
                  { key: 'officeLocation' as SortKey, label: 'Office Location', className: 'hidden lg:table-cell' },
                  { key: 'businessUnit' as SortKey, label: 'Business Unit', className: 'hidden lg:table-cell' },
                  { key: 'jobTitle' as SortKey, label: 'Job Title', className: 'hidden md:table-cell' },
                  { key: 'email' as SortKey, label: 'Email', className: 'hidden md:table-cell' },
                  { key: 'seniority' as SortKey, label: 'Seniority', className: 'hidden lg:table-cell' },
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
                  {source === 'project-reallocations' ? (
                    <>
                      <td className="hidden md:table-cell px-4 py-3 text-secondary">{record.account || '—'}</td>
                      <td className="hidden lg:table-cell px-4 py-3 text-secondary">{record.team || '—'}</td>
                      <td className="hidden md:table-cell px-4 py-3 text-secondary">{record.mainSkill || '—'}</td>
                      <td className="hidden lg:table-cell px-4 py-3 text-secondary">{record.seniority || '—'}</td>
                      <td className="hidden md:table-cell px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">
                          {record.transitionStatus || '—'}
                        </span>
                      </td>
                      <td className="hidden lg:table-cell px-4 py-3 text-secondary">{record.location || '—'}</td>
                      <td className="hidden lg:table-cell px-4 py-3">
                        {record.impact ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            record.impact === 'High' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                              : record.impact === 'Medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                          }`}>
                            {record.impact}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="hidden lg:table-cell px-4 py-3">
                        {record.attritionRisk ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            record.attritionRisk === 'High' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                              : record.attritionRisk === 'Medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                          }`}>
                            {record.attritionRisk}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-secondary">{record.presentationsCount ?? 0}</td>
                    </>
                  ) : source === 'open-positions' ? (
                    <>
                      <td className="hidden md:table-cell px-4 py-3 text-secondary">{record.account || '—'}</td>
                      <td className="hidden md:table-cell px-4 py-3 text-secondary">{record.mainSkill || '—'}</td>
                      <td className="hidden lg:table-cell px-4 py-3 text-secondary">{record.coe || '—'}</td>
                      <td className="hidden lg:table-cell px-4 py-3 text-secondary">{record.stakeholder || '—'}</td>
                      <td className="hidden lg:table-cell px-4 py-3 text-secondary">{record.countries || '—'}</td>
                      <td className="hidden lg:table-cell px-4 py-3 text-secondary">{record.seniorities || '—'}</td>
                      <td className="px-4 py-3">
                        {record.hasJobDescription ? (
                          <CheckIcon size="sm" className="text-emerald-500" />
                        ) : (
                          <CloseIcon size="sm" className="text-gray-400 dark:text-gray-500" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-secondary">{record.candidatesCount ?? 0}</td>
                    </>
                  ) : source === 'candidates' ? (
                    <>
                      <td className="hidden md:table-cell px-4 py-3">
                        {record.coeCertified ? (
                          <CheckIcon size="sm" className="text-emerald-500" />
                        ) : (
                          <CloseIcon size="sm" className="text-gray-400 dark:text-gray-500" />
                        )}
                      </td>
                      <td className="hidden md:table-cell px-4 py-3 text-secondary">{record.email || '—'}</td>
                      <td className="hidden md:table-cell px-4 py-3 text-secondary">{record.mainSkill || '—'}</td>
                      <td className="hidden lg:table-cell px-4 py-3 text-secondary">{record.candidateStatus || '—'}</td>
                      <td className="hidden lg:table-cell px-4 py-3 text-secondary whitespace-nowrap">
                        {record.lastStatusUpdate
                          ? new Date(record.lastStatusUpdate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : '—'}
                      </td>
                      <td className="hidden lg:table-cell px-4 py-3 text-secondary whitespace-nowrap">
                        {record.grossMonthlySalary != null && record.grossMonthlySalary > 0
                          ? formatSalary(record.grossMonthlySalary, record.currency || undefined)
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-secondary whitespace-nowrap">
                        {record.salaryExpectations != null && record.salaryExpectations > 0
                          ? formatSalary(record.salaryExpectations, record.salaryExpectationsCurrency || undefined)
                          : '—'}
                      </td>
                      <td className="hidden lg:table-cell px-4 py-3 text-secondary">{record.country || '—'}</td>
                    </>
                  ) : (
                    <>
                      <td className="hidden md:table-cell px-4 py-3 text-secondary">{record.mainSkill || '—'}</td>
                      <td className="hidden md:table-cell px-4 py-3 text-secondary">{record.functionalUnit || '—'}</td>
                      <td className="hidden lg:table-cell px-4 py-3 text-secondary">{record.officeLocation || '—'}</td>
                      <td className="hidden lg:table-cell px-4 py-3 text-secondary">{record.businessUnit || '—'}</td>
                      <td className="hidden md:table-cell px-4 py-3 text-secondary whitespace-nowrap">{record.jobTitle || '—'}</td>
                      <td className="hidden md:table-cell px-4 py-3 text-secondary">{record.email || '—'}</td>
                      <td className="hidden lg:table-cell px-4 py-3 text-secondary">{record.seniority || '—'}</td>
                      <td className="px-4 py-3 text-secondary whitespace-nowrap">
                        {record.grossMonthlySalary != null
                          ? formatSalary(record.grossMonthlySalary, record.currency)
                          : '—'}
                      </td>
                      <td className="hidden lg:table-cell px-4 py-3 text-secondary">{record.country || '—'}</td>
                    </>
                  )}
                  {source !== 'open-positions' && source !== 'project-reallocations' && (
                    <td className="px-4 py-3">
                      {record.hasResume ? (
                        <span className="inline-flex items-center gap-1.5">
                          <CheckIcon size="sm" className="text-emerald-500" />
                          {record.resumeFilename && (
                            <span className="text-xs text-accent-500 truncate max-w-[120px]" title={record.resumeFilename}>
                              {record.resumeFilename}
                            </span>
                          )}
                        </span>
                      ) : (
                        <CloseIcon size="sm" className="text-gray-400 dark:text-gray-500" />
                      )}
                    </td>
                  )}
                  <td className="hidden md:table-cell px-4 py-3">
                    {extractingUpstreamId === record.upstreamId ? (
                      <SpinnerIcon size="sm" className="text-blue-500" />
                    ) : vectorizingUpstreamId === record.upstreamId ? (
                      <SpinnerIcon size="sm" className="text-violet-500" />
                    ) : record.pipelineStatus === 'extracted' && onVectorizeRecord ? (
                      <button
                        onClick={() => onVectorizeRecord(record.upstreamId)}
                        disabled={vectorizingId === record.upstreamId}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-violet-400 hover:text-violet-500 hover:bg-violet-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Vectorize this resume"
                      >
                        {vectorizingId === record.upstreamId ? (
                          <SpinnerIcon size="sm" className="text-violet-500" />
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
                      <button
                        onClick={() => setErrorDetail({
                          name: record.name || record.email?.split('@')[0] || 'Unknown',
                          error: displayReason(record),
                        })}
                        className={`inline-flex items-center gap-1.5 text-xs max-w-[200px] truncate transition-colors group ${
                          record.pipelineStatus.endsWith('_failed')
                            ? 'text-red-600 dark:text-red-400 font-medium'
                            : 'text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400'
                        }`}
                        title={displayReason(record) || 'Click to view full error'}
                      >
                        <svg className={`w-3.5 h-3.5 flex-shrink-0 transition-opacity ${
                          record.pipelineStatus.endsWith('_failed') ? 'opacity-100' : 'opacity-50 group-hover:opacity-100'
                        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        {displayReason(record)}
                      </button>
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

      {errorDetail && (
        <ErrorDetailModal
          name={errorDetail.name}
          error={errorDetail.error}
          onClose={() => setErrorDetail(null)}
        />
      )}
    </div>
  );
});

export default SyncRecordTable;
