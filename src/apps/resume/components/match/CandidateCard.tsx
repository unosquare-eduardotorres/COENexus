import { MatchCandidate } from '../../types';
import ScoreRing from './ScoreRing';
import CategoryBar from './CategoryBar';

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

  return (
    <div
      className="glass-card-hover cursor-pointer"
      onClick={onSelect}
      style={{
        opacity: 1,
        transform: 'translateY(0)',
        transition: 'all 0.4s ease',
        transitionDelay: `${rank * 80}ms`,
      }}
    >
      <div className="flex items-center gap-4 p-4">
        <span className="text-lg font-mono font-bold text-muted w-8 text-center">{rank}</span>

        <ScoreRing score={candidate.matchScore} size={56} />

        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 ${avatarGradient}`}
        >
          {getInitials(candidate.name)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-semibold text-primary truncate">{candidate.name}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${typeBadge}`}>
              {candidate.type}
            </span>
          </div>
          <div className="text-xs text-secondary">{candidate.role}</div>
          <div className="text-xs text-muted truncate">{candidate.summary}</div>
        </div>

        <div className="hidden md:block w-32 space-y-1.5">
          <CategoryBar label="Technical" value={candidate.scores.technical} tooltip="Hard skills, frameworks, and tools match" />
          <CategoryBar label="Domain" value={candidate.scores.domain} tooltip="Industry knowledge and vertical experience" />
        </div>

        <div className="hidden lg:flex flex-col items-end text-right gap-0.5">
          <span className="text-xs text-muted">{candidate.location}</span>
          <span className="text-xs text-muted">{candidate.salary}</span>
          <span className="text-xs text-muted">{candidate.availability}</span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleCompare();
          }}
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
