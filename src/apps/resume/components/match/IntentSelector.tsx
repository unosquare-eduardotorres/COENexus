import { MatchFlowType } from '../../types';

interface IntentSelectorProps {
  onSelect: (flow: MatchFlowType) => void;
  onViewHistory?: () => void;
  sessionCount?: number;
}

interface IntentOption {
  id: MatchFlowType;
  title: string;
  description: string;
  tags: string[];
  icon: JSX.Element;
  gradient: string;
  tagColor: string;
  enabled: boolean;
}

function UserSearchIcon() {
  return (
    <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="7" r="4" />
      <path d="M10.3 15H7a4 4 0 0 0-4 4v2" />
      <circle cx="17" cy="17" r="3" />
      <path d="m21 21-1.9-1.9" />
    </svg>
  );
}

function GitCompareArrowsIcon() {
  return (
    <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="6" r="3" />
      <path d="M12 6h5a2 2 0 0 1 2 2v7" />
      <path d="m15 9-3-3 3-3" />
      <circle cx="19" cy="18" r="3" />
      <path d="M12 18H7a2 2 0 0 1-2-2V9" />
      <path d="m9 15 3 3-3 3" />
    </svg>
  );
}

function MicroscopeIcon() {
  return (
    <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 18h8" />
      <path d="M3 22h18" />
      <path d="M14 22a7 7 0 1 0 0-14h-1" />
      <path d="M9 14h2" />
      <path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z" />
      <path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3" />
    </svg>
  );
}

function FlameIcon() {
  return (
    <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M12 23c-3.866 0-7-3.134-7-7 0-3.5 2.5-6 4-8 .378-.505 1.06-.378 1.28.12C11 9.5 12 10.5 12 10.5s2.5-3.5 3-6c.135-.676.878-.876 1.3-.38C18.5 6.5 19 9 19 11c0 1-.5 2.5-1 3.5-.318.636.19 1.396.9 1.15.332-.115.62-.31.85-.55.23.87.25 1.87.25 1.9 0 3.866-3.134 7-7 7z" />
      <path d="M12 23c-2.21 0-4-1.79-4-4 0-2 1.5-3.5 2.5-4.5.354-.354.964-.158 1.05.34.15.87.65 1.66 1.45 2.16.39-.87.72-1.78.85-2.74.07-.52.62-.74 1.01-.4C16.2 15.06 17 16.5 17 18.2c0 2.65-2.24 4.8-5 4.8z" opacity="0.6" />
    </svg>
  );
}

function ClockHistoryIcon() {
  return (
    <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

const INTENTS: IntentOption[] = [
  {
    id: 'find-for-position',
    title: 'Find candidates for a position',
    description:
      'Describe a role or select an open position, then let AI search your entire talent pool for the best matches.',
    tags: ['AI Search', 'Ranking', 'Gap Analysis'],
    icon: <UserSearchIcon />,
    gradient: 'from-emerald-500 to-teal-500',
    tagColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    enabled: true,
  },
  {
    id: 'bench-burn',
    title: 'Bench Burn',
    description:
      'Find the best position match for employees currently on bench — reduce idle time fast.',
    tags: ['Bench Only', 'AI Search', 'Fast Placement'],
    icon: <FlameIcon />,
    gradient: 'from-orange-500 to-red-500',
    tagColor: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    enabled: true,
  },
  {
    id: 'match-to-positions',
    title: 'Match a candidate to open positions',
    description:
      'Select a candidate and discover the best-fitting open positions based on their profile.',
    tags: ['Profile Analysis', 'Position Matching', 'Fit Score'],
    icon: <GitCompareArrowsIcon />,
    gradient: 'from-indigo-500 to-purple-500',
    tagColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    enabled: false,
  },
  {
    id: 'delivery-to-op',
    title: 'Delivery Professional to OP',
    description:
      'Deep analysis of why a delivery professional is or is not a fit for an open position — strengths, gaps, and recommendations.',
    tags: ['Deep Analysis', 'Fit Assessment', 'Recommendations'],
    icon: <MicroscopeIcon />,
    gradient: 'from-rose-500 to-pink-500',
    tagColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    enabled: false,
  },
];

export default function IntentSelector({ onSelect, onViewHistory, sessionCount = 0 }: IntentSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <h2 className="text-lg font-semibold text-primary">What would you like to do?</h2>
        <p className="text-sm text-muted mt-1">Choose your matching workflow to get started</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {INTENTS.map((intent) =>
          intent.enabled ? (
            <button
              key={intent.id}
              onClick={() => onSelect(intent.id)}
              className="text-left p-6 rounded-2xl border-2 border-gray-200/30 dark:border-dark-border/30 glass-panel-subtle hover:border-emerald-500/30 transition-all duration-200 group h-full"
            >
              <div className="flex flex-col items-center text-center gap-4 h-full">
                <div
                  className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${intent.gradient} flex items-center justify-center text-white flex-shrink-0`}
                >
                  {intent.icon}
                </div>
                <div className="flex-1 min-w-0 flex flex-col">
                  <h3 className="text-base font-semibold text-primary">{intent.title}</h3>
                  <p className="text-sm text-muted mt-1.5 leading-relaxed">{intent.description}</p>
                  <div className="flex flex-wrap justify-center gap-1.5 mt-auto pt-3">
                    {intent.tags.map((tag) => (
                      <span key={tag} className={`px-2 py-0.5 text-[11px] font-medium rounded-md ${intent.tagColor}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          ) : (
            <div
              key={intent.id}
              className="p-6 rounded-2xl border-2 border-dashed border-gray-200/30 dark:border-dark-border/30 opacity-50 cursor-not-allowed h-full"
            >
              <div className="flex flex-col items-center text-center gap-4 h-full">
                <div className="w-20 h-20 rounded-2xl bg-gray-200/50 dark:bg-dark-hover flex items-center justify-center text-gray-400 flex-shrink-0">
                  {intent.icon}
                </div>
                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="flex items-center justify-center gap-2">
                    <h3 className="text-base font-semibold text-gray-400 dark:text-gray-500">{intent.title}</h3>
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-gray-100 dark:bg-dark-hover text-gray-400 dark:text-gray-500 rounded-full uppercase tracking-wider">
                      Soon
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 dark:text-gray-600 mt-1.5 leading-relaxed">{intent.description}</p>
                </div>
              </div>
            </div>
          )
        )}

        <button
          onClick={onViewHistory}
          className="text-left p-6 rounded-2xl border-2 border-gray-200/30 dark:border-dark-border/30 glass-panel-subtle hover:border-amber-500/30 transition-all duration-200 group h-full"
        >
          <div className="flex flex-col items-center text-center gap-4 h-full">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white flex-shrink-0">
              <ClockHistoryIcon />
            </div>
            <div className="flex-1 min-w-0 flex flex-col">
              <h3 className="text-base font-semibold text-primary">Search History</h3>
              <p className="text-sm text-muted mt-1.5 leading-relaxed">
                Review previous search sessions, compare results, and revisit past candidate matches.
              </p>
              <div className="flex flex-wrap justify-center gap-1.5 mt-auto pt-3">
                {sessionCount > 0 ? (
                  <span className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    {sessionCount} session{sessionCount !== 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    No sessions yet
                  </span>
                )}
              </div>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
