import { MatchCandidate } from '../../types';
import { formatSalary, formatEmployeeRate } from '../../utils/formatSalary';
import ScoreRing from './ScoreRing';
import CategoryBar from './CategoryBar';
import FitVerdictSummary from './shared/FitVerdictSummary';

interface CandidateCardProps {
  candidate: MatchCandidate;
  rank: number;
  isCompareSelected: boolean;
  onSelect: () => void;
  onToggleCompare: () => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
}

export default function CandidateCard({
  candidate,
  rank,
  isCompareSelected,
  onSelect,
  onToggleCompare,
}: CandidateCardProps) {
  const avatarGradient =
    candidate.type === 'employee'
      ? 'bg-gradient-to-br from-indigo-500 to-indigo-600'
      : 'bg-gradient-to-br from-amber-500 to-amber-600';

  const typeBadge =
    candidate.type === 'employee'
      ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400';

  const statusColors: Record<string, string> = {
    'Pool': 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    'Hired': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    'Do Not Call': 'bg-red-500/10 text-red-600 dark:text-red-400',
    'Employee': 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  };
  const statusLabel = candidate.candidateStatus ?? candidate.type;
  const statusBadgeClass = statusColors[statusLabel] ?? (candidate.type === 'employee'
    ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400');

  const salaryLines = (() => {
    if (candidate.type === 'candidate') {
      const lines: { label: string; value: string }[] = [];
      const cur = candidate.expectedRate;
      const curCurrency = candidate.currency || undefined;
      if (cur && cur > 0) lines.push({ label: 'Current', value: formatSalary(cur, curCurrency) });
      const exp = candidate.salaryExpectations;
      const expCur = candidate.salaryExpectationsCurrency || undefined;
      if (exp && exp > 0) lines.push({ label: 'Expected', value: formatSalary(exp, expCur) });
      if (lines.length === 0) lines.push({ label: '', value: 'No salary info' });
      return lines;
    }
    const { display } = formatEmployeeRate(candidate.expectedRate, candidate.currency);
    return [{ label: '', value: display }];
  })();

  const sharepointUrl = candidate.type === 'employee'
    ? `https://unosquare.sharepoint.com/sites/CoE-Core/SitePages/Employees.aspx?employeeId=${candidate.id}`
    : `https://unosquare.sharepoint.com/sites/CoE-Core/SitePages/Candidates.aspx?CandidateId=${candidate.id}`;

  return (
    <div
      className="glass-card-hover"
      style={{
        opacity: 1,
        transform: 'translateY(0)',
        transition: 'all 0.4s ease',
        transitionDelay: `${rank * 80}ms`,
      }}
    >
      <div className="flex items-center gap-4 p-4">
        <button
          type="button"
          onClick={onSelect}
          className="appearance-none bg-transparent border-none p-0 text-left w-full flex items-center gap-4 flex-1 min-w-0 cursor-pointer"
        >
          <span className="text-lg font-mono font-bold text-muted w-8 text-center">{rank}</span>

          <ScoreRing score={candidate.matchScore} size={56} />

          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 ${avatarGradient}`}
          >
            {getInitials(candidate.name)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-semibold text-primary truncate" title={candidate.name}>{candidate.name}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${statusBadgeClass}`}>
                {statusLabel}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-secondary">{candidate.role}</span>
              {candidate.mainSkill && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 flex-shrink-0">
                  {candidate.mainSkill}
                </span>
              )}
            </div>
          <div className="text-xs text-muted truncate" title={candidate.summary}><FitVerdictSummary summary={candidate.summary} fitVerdict={candidate.analysis?.fitVerdict} variant="inline" /></div>
          </div>

          <div className="hidden lg:flex flex-col items-end text-right gap-0.5 min-w-[140px]">
            {candidate.country && (
              <span className="text-xs text-secondary font-medium">{candidate.country}</span>
            )}
            {salaryLines.map((line, i) => (
              <span key={i} className="text-xs text-muted" title={line.label ? `${line.label} Salary` : undefined}>
                {line.label ? <span className="text-xs text-muted/60 mr-1">{line.label}:</span> : null}
                {line.value}
              </span>
            ))}
            {candidate.lastStatusUpdate && (
              <span className="text-xs text-muted">
                Updated: {new Date(candidate.lastStatusUpdate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </span>
            )}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${typeBadge}`}>
              {candidate.type}
            </span>
          </div>

          <div className="hidden md:block w-32 space-y-1.5">
            <CategoryBar label="Technical" value={candidate.scores.technical} tooltip="Hard skills, frameworks, and tools match" />
            <CategoryBar label="Domain" value={candidate.scores.domain} tooltip="Industry knowledge and vertical experience" />
          </div>
        </button>

        <a
          href={sharepointUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-8 h-8 flex items-center justify-center rounded-lg glass-panel-subtle text-muted hover:text-accent-500 transition-colors flex-shrink-0"
          title="View in SharePoint"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>

        <button
          type="button"
          onClick={onToggleCompare}
          className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-all duration-200 flex-shrink-0 ${
            isCompareSelected
              ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-500'
              : 'glass-panel-subtle text-muted hover:text-secondary'
          }`}
        >
          {isCompareSelected ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
