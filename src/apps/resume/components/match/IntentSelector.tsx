import { MatchFlowType } from '../../types';

interface IntentSelectorProps {
  onSelect: (flow: MatchFlowType) => void;
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

const INTENTS: IntentOption[] = [
  {
    id: 'find-for-position',
    title: 'Find candidates for a position',
    description:
      'Describe a role or select an open position, then let AI search your entire talent pool for the best matches.',
    tags: ['AI Search', 'Ranking', 'Gap Analysis'],
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
    gradient: 'from-emerald-500 to-teal-500',
    tagColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    enabled: true,
  },
  {
    id: 'match-to-positions',
    title: 'Match a candidate to open positions',
    description:
      'Select a candidate and discover the best-fitting open positions based on their profile.',
    tags: ['Profile Analysis', 'Position Matching', 'Fit Score'],
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M21 13.255A23.193 23.193 0 0112 15c-3.183 0-6.22-.64-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"
        />
      </svg>
    ),
    gradient: 'from-indigo-500 to-purple-500',
    tagColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    enabled: false,
  },
];

export default function IntentSelector({ onSelect }: IntentSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <h2 className="text-lg font-semibold text-primary">What would you like to do?</h2>
        <p className="text-sm text-muted mt-1">Choose your matching workflow to get started</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {INTENTS.map((intent) =>
          intent.enabled ? (
            <button
              key={intent.id}
              onClick={() => onSelect(intent.id)}
              className="text-left p-6 rounded-2xl border-2 border-gray-200/30 dark:border-dark-border/30 glass-panel-subtle hover:border-emerald-500/30 transition-all duration-200 group"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-14 h-14 rounded-xl bg-gradient-to-br ${intent.gradient} flex items-center justify-center text-white flex-shrink-0`}
                >
                  {intent.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-primary">{intent.title}</h3>
                  <p className="text-sm text-muted mt-1.5 leading-relaxed">{intent.description}</p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
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
              className="p-6 rounded-2xl border-2 border-dashed border-gray-200/30 dark:border-dark-border/30 opacity-50"
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-gray-200/50 dark:bg-dark-hover flex items-center justify-center text-gray-400 flex-shrink-0">
                  {intent.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-gray-400 dark:text-gray-500">{intent.title}</h3>
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-gray-100 dark:bg-dark-hover text-gray-400 dark:text-gray-500 rounded-full uppercase tracking-wider">
                      In Development
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 dark:text-gray-600 mt-1.5 leading-relaxed">{intent.description}</p>
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
