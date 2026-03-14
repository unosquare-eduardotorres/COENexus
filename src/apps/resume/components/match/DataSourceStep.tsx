import { useState } from 'react';
import { DataSource, TopN, PoolCounts } from '../../types';

interface DataSourceStepProps {
  onNext: (source: DataSource, topN: TopN) => void;
  initialSource?: DataSource;
  poolCounts: PoolCounts | null;
}

interface SourceOption {
  id: DataSource;
  title: string;
  description: string;
  icon: JSX.Element;
  gradient: string;
  badgeClass: string;
  countKey: keyof PoolCounts;
}

const SOURCES: SourceOption[] = [
  {
    id: 'bench',
    title: 'Bench',
    description: 'Employees currently available for staffing — ready to start immediately.',
    countKey: 'bench',
    icon: (
      <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12h16" strokeWidth={2} />
        <path d="M5 12v5M19 12v5" />
        <path d="M4 17h2M18 17h2" />
        <path d="M6 12V9.5a1 1 0 011-1h10a1 1 0 011 1V12" />
        <path d="M3.5 9c0-.6.3-1.1.8-1.3" />
        <path d="M20.5 9c0-.6-.3-1.1-.8-1.3" />
      </svg>
    ),
    gradient: 'from-emerald-500 to-green-500',
    badgeClass: 'bg-emerald-500/15 text-emerald-400',
  },
  {
    id: 'all-employees',
    title: 'Employees',
    description: 'Full employee directory including bench. Broader search across the organization.',
    countKey: 'employees',
    icon: (
      <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <path d="M9 22v-4h6v4" />
        <path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01" />
      </svg>
    ),
    gradient: 'from-indigo-500 to-blue-500',
    badgeClass: 'bg-indigo-500/15 text-indigo-400',
  },
  {
    id: 'candidates',
    title: 'Candidates',
    description: 'External candidates from all sourcing channels — job boards, referrals, direct applications.',
    countKey: 'candidates',
    icon: (
      <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    gradient: 'from-violet-500 to-purple-500',
    badgeClass: 'bg-violet-500/15 text-violet-400',
  },
  {
    id: 'all-sources',
    title: 'All Sources',
    description: 'Combined search across all employees and external candidates. Maximum coverage.',
    countKey: 'allSources',
    icon: (
      <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        <ellipse cx="12" cy="12" rx="10" ry="4" />
        <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
        <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
      </svg>
    ),
    gradient: 'from-amber-500 to-orange-500',
    badgeClass: 'bg-amber-500/15 text-amber-400',
  },
];

const TOP_N_OPTIONS: { value: TopN; label: string; tier: string; gradient: string; description: string }[] = [
  { value: 1, label: 'Top 1', tier: 'Diamond', gradient: 'from-cyan-300 to-blue-500', description: 'Single best match' },
  { value: 10, label: 'Top 10', tier: 'Gold', gradient: 'from-amber-400 to-yellow-500', description: 'Best matches, fastest results' },
  { value: 20, label: 'Top 20', tier: 'Silver', gradient: 'from-gray-300 to-gray-400', description: 'Balanced depth and speed' },
  { value: 30, label: 'Top 30', tier: 'Bronze', gradient: 'from-orange-400 to-amber-600', description: 'Maximum coverage' },
];

export default function DataSourceStep({ onNext, initialSource, poolCounts }: DataSourceStepProps) {
  const [selected, setSelected] = useState<DataSource | null>(initialSource ?? null);
  const [topN, setTopN] = useState<TopN>(10);

  const getCount = (key: keyof PoolCounts) => (poolCounts ? poolCounts[key] : null);
  const isDisabled = (source: SourceOption) => poolCounts !== null && poolCounts[source.countKey] === 0;

  return (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <h2 className="text-lg font-semibold text-primary">Where should we search?</h2>
        <p className="text-sm text-muted mt-1">Choose which talent pool the AI will search through</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SOURCES.map((source) => {
          const isSelected = selected === source.id;
          const disabled = isDisabled(source);
          return (
            <button
              key={source.id}
              onClick={() => !disabled && setSelected(source.id)}
              disabled={disabled}
              className={`text-left p-6 rounded-2xl border-2 transition-all duration-200 group ${
                disabled
                  ? 'opacity-40 cursor-not-allowed border-gray-200/20 dark:border-dark-border/20'
                  : isSelected
                    ? 'border-accent-500/50 bg-accent-500/5 dark:bg-accent-500/5'
                    : 'border-gray-200/30 dark:border-dark-border/30 glass-panel-subtle hover:border-accent-500/20'
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-16 h-16 rounded-xl bg-gradient-to-br ${source.gradient} flex items-center justify-center text-white flex-shrink-0`}
                >
                  {source.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-primary">{source.title}</h3>
                    {getCount(source.countKey) !== null && getCount(source.countKey)! > 0 && (
                      <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md ${source.badgeClass}`}>
                        {getCount(source.countKey)!.toLocaleString()} profiles
                      </span>
                    )}
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-accent-500 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted mt-1.5 leading-relaxed">{source.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-primary mb-3 text-center">How many candidates to analyze?</h3>
        <div className="grid grid-cols-4 gap-3">
          {TOP_N_OPTIONS.map((option) => {
            const isActive = topN === option.value;
            return (
              <button
                key={option.value}
                onClick={() => setTopN(option.value)}
                className={`p-4 rounded-xl border-2 transition-all duration-200 text-center ${
                  isActive
                    ? 'border-accent-500/50 bg-accent-500/5'
                    : 'border-gray-200/30 dark:border-dark-border/30 glass-panel-subtle hover:border-accent-500/20'
                }`}
              >
                <div className={`text-xs font-bold uppercase tracking-wider bg-gradient-to-r ${option.gradient} bg-clip-text text-transparent`}>
                  {option.tier}
                </div>
                <div className="text-lg font-bold text-primary mt-1">{option.label}</div>
                <div className="text-[11px] text-muted mt-0.5">{option.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={() => selected && onNext(selected, topN)}
        disabled={!selected}
        className="w-full py-3 px-6 bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 text-white rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:from-accent-500 disabled:hover:to-accent-600"
      >
        Search This Pool
      </button>
    </div>
  );
}
