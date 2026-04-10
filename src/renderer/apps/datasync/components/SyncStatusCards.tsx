import { SyncProgress, SyncRecord, PipelineStatus } from '../types';
import { ISSUE_STATUS_COLORS, PIPELINE_STATUS_COLORS } from '../../resume/utils/statusColors';
import { CheckIcon, DocumentIcon, SettingsIcon } from '../../../shared/components/icons';

export type StatusCardKey = PipelineStatus | 'all' | 'excluded';

export interface StatusCardDef {
  key: StatusCardKey;
  label: string;
  icon: (className: string) => JSX.Element;
  borderColor: string;
  bgColor: string;
  iconColor: string;
  glowRing: string;
  glowShadow: string;
  getValue: (p: SyncProgress, records: SyncRecord[]) => number;
}

const ERROR_ICON = (className: string) => (
  <svg className={`w-5 h-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
);

export const ISSUE_CARDS: StatusCardDef[] = [
  {
    key: 'incomplete',
    label: 'Incomplete',
    icon: (className) => (
      <svg className={`w-5 h-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    ...ISSUE_STATUS_COLORS.incomplete,
    getValue: (_p, records) => records.filter(r => r.pipelineStatus === 'incomplete').length,
  },
  {
    key: 'not-processed',
    label: 'Not Processed',
    icon: (className) => (
      <svg className={`w-5 h-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    ),
    ...ISSUE_STATUS_COLORS['not-processed'],
    getValue: (_p, records) => records.filter(r => r.pipelineStatus === 'not-processed').length,
  },
  {
    key: 'excluded',
    label: 'Excluded',
    icon: (className) => (
      <svg className={`w-5 h-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    ),
    ...ISSUE_STATUS_COLORS.excluded,
    getValue: (p) => p.skippedCount ?? 0,
  },
  {
    key: 'sync_failed',
    label: 'Sync Failed',
    icon: ERROR_ICON,
    ...ISSUE_STATUS_COLORS.sync_failed,
    getValue: (_p, records) => records.filter(r => r.pipelineStatus === 'sync_failed').length,
  },
  {
    key: 'extract_failed',
    label: 'Extract Failed',
    icon: ERROR_ICON,
    ...ISSUE_STATUS_COLORS.extract_failed,
    getValue: (_p, records) => records.filter(r => r.pipelineStatus === 'extract_failed').length,
  },
  {
    key: 'vectorize_failed',
    label: 'Vectorize Failed',
    icon: ERROR_ICON,
    ...ISSUE_STATUS_COLORS.vectorize_failed,
    getValue: (_p, records) => records.filter(r => r.pipelineStatus === 'vectorize_failed').length,
  },
];

export const PIPELINE_CARDS: StatusCardDef[] = [
  {
    key: 'synced',
    label: 'Synced',
    icon: (className) => <CheckIcon className={className} />,
    ...PIPELINE_STATUS_COLORS.synced,
    getValue: (_p, records) => records.filter(r => r.pipelineStatus === 'synced').length,
  },
  {
    key: 'extracted',
    label: 'Extracted',
    icon: (className) => <DocumentIcon className={className} />,
    ...PIPELINE_STATUS_COLORS.extracted,
    getValue: (_p, records) => records.filter(r => r.pipelineStatus === 'extracted').length,
  },
  {
    key: 'vectorized',
    label: 'Vectorized',
    icon: (className) => <SettingsIcon className={className} />,
    ...PIPELINE_STATUS_COLORS.vectorized,
    getValue: (_p, records) => records.filter(r => r.pipelineStatus === 'vectorized').length,
  },
];

function pct(count: number, base: number): string {
  if (base === 0) return '0%';
  return `${Math.round((count / base) * 100)}%`;
}

interface SyncStatusCardsProps {
  cards: StatusCardDef[];
  progress: SyncProgress;
  records: SyncRecord[];
  statusFilter: StatusCardKey;
  fetchedBase: number;
  isRecordDerived: (key: StatusCardKey) => boolean;
  groupLabel: string;
  onCardClick: (key: StatusCardKey) => void;
}

export default function SyncStatusCards({
  cards,
  progress,
  records,
  statusFilter,
  fetchedBase,
  isRecordDerived,
  groupLabel,
  onCardClick,
}: SyncStatusCardsProps) {
  return (
    <div className="grid grid-cols-3 gap-4" role="tablist" aria-label={groupLabel}>
      {cards.map((card) => {
        const isSelected = statusFilter === card.key;
        const value = card.getValue(progress, records);
        const isDerived = isRecordDerived(card.key);
        return (
          <button
            key={card.key}
            id={`sync-status-tab-${card.key}`}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-controls="sync-records-panel"
            tabIndex={0}
            aria-label={`${card.label}: ${value.toLocaleString()} (${pct(value, isDerived ? records.length : fetchedBase)})`}
            onClick={() => onCardClick(card.key)}
            className={`glass-card p-5 border text-left transition-all duration-200 cursor-pointer hover:scale-[1.02] ${
              isSelected
                ? `${card.borderColor} ${card.glowRing} ${card.glowShadow}`
                : `${card.borderColor} hover:shadow-md`
            }`}
          >
            <div className="flex items-center gap-2.5 mb-3">
              <div className={`w-10 h-10 rounded-lg ${card.bgColor} flex items-center justify-center flex-shrink-0`}>
                {card.icon(card.iconColor)}
              </div>
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">{card.label}</span>
            </div>
            <div className="text-3xl font-bold text-primary">{value.toLocaleString()}</div>
            <div className="text-xs text-muted mt-1">
              {pct(value, isDerived ? records.length : fetchedBase)} of {isDerived ? 'total' : 'fetched'}
            </div>
          </button>
        );
      })}
    </div>
  );
}
