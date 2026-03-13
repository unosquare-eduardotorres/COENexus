import { MatchCandidate } from '../../types';
import ScoreRing from './ScoreRing';
import CategoryBar from './CategoryBar';
import RadarChart from './RadarChart';

interface CompareViewProps {
  candidates: MatchCandidate[];
  onBack: () => void;
}

const LEGEND_COLORS = ['#0d9488', '#6366f1', '#f59e0b'];

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
}

export default function CompareView({ candidates, onBack }: CompareViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted hover:text-secondary transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Results
        </button>
        <div>
          <h2 className="text-lg font-bold text-primary">Compare Candidates</h2>
          <p className="text-xs text-muted">
            {candidates.length} candidate{candidates.length !== 1 ? 's' : ''} selected
          </p>
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-primary mb-4">Skill Radar Comparison</h3>
        <div className="flex flex-col md:flex-row items-center gap-6">
          <RadarChart candidates={candidates} size={300} />
          <div className="space-y-2">
            {candidates.map((candidate, index) => (
              <div key={candidate.id} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: LEGEND_COLORS[index % LEGEND_COLORS.length] }}
                />
                <span className="text-sm text-secondary">{candidate.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {candidates.map((candidate, index) => {
          const avatarGradient =
            candidate.type === 'employee'
              ? 'bg-gradient-to-br from-indigo-500 to-indigo-600'
              : 'bg-gradient-to-br from-amber-500 to-amber-600';

          const typeBadge =
            candidate.type === 'employee'
              ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400';

          const matchCount = candidate.skills.filter((s) => s.status === 'match').length;
          const partialCount = candidate.skills.filter((s) => s.status === 'partial').length;
          const missingCount = candidate.skills.filter((s) => s.status === 'missing').length;

          return (
            <div key={candidate.id} className="glass-card p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full flex-shrink-0`}
                  style={{ backgroundColor: LEGEND_COLORS[index % LEGEND_COLORS.length] }}
                />
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 ${avatarGradient}`}
                >
                  {getInitials(candidate.name)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-primary truncate">{candidate.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${typeBadge}`}>
                      {candidate.type}
                    </span>
                  </div>
                  <div className="text-xs text-secondary truncate">{candidate.role}</div>
                </div>
              </div>

              <div className="flex justify-center">
                <ScoreRing score={candidate.matchScore} size={72} />
              </div>

              <div className="space-y-2">
                <CategoryBar label="Technical" value={candidate.scores.technical} />
                <CategoryBar label="Domain" value={candidate.scores.domain} />
                <CategoryBar label="Leadership" value={candidate.scores.leadership} />
                <CategoryBar label="Soft Skills" value={candidate.scores.softSkills} />
                <CategoryBar label="Availability" value={candidate.scores.availability} />
              </div>

              <div className="space-y-1.5">
                {candidate.skills.map((skill) => (
                  <div key={skill.name} className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        skill.status === 'match'
                          ? 'bg-emerald-500'
                          : skill.status === 'partial'
                            ? 'bg-amber-500'
                            : 'bg-red-500'
                      }`}
                    />
                    <span className="text-xs text-secondary flex-1 truncate">{skill.name}</span>
                    <span className="text-xs font-mono text-muted">{skill.years}y</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-gray-200/20 dark:border-dark-border/20">
                <span className="text-xs font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded">
                  {matchCount} match
                </span>
                <span className="text-xs font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded">
                  {partialCount} partial
                </span>
                <span className="text-xs font-mono bg-red-500/10 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded">
                  {missingCount} gap{missingCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
