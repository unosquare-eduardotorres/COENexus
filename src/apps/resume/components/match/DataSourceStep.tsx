import { useState } from 'react';
import { DataSource } from '../../types';

interface DataSourceStepProps {
  onNext: (source: DataSource) => void;
  initialSource?: DataSource;
}

interface SourceOption {
  id: DataSource;
  title: string;
  description: string;
  poolSize: string;
  icon: JSX.Element;
  gradient: string;
}

const SOURCES: SourceOption[] = [
  {
    id: 'bench',
    title: 'Bench',
    description: 'Employees currently available for staffing — ready to start immediately.',
    poolSize: '~70–150 profiles',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    gradient: 'from-emerald-500 to-green-500',
  },
  {
    id: 'all-employees',
    title: 'All Employees',
    description: 'Full employee directory including bench. Broader search across the organization.',
    poolSize: '1,000+ profiles',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    gradient: 'from-indigo-500 to-blue-500',
  },
  {
    id: 'candidates',
    title: 'Candidates',
    description: 'External candidates from all sourcing channels — job boards, referrals, direct applications.',
    poolSize: '~50K profiles',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    gradient: 'from-violet-500 to-purple-500',
  },
  {
    id: 'all-sources',
    title: 'All Sources',
    description: 'Combined search across all employees and external candidates. Maximum coverage.',
    poolSize: 'Everything',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    gradient: 'from-amber-500 to-orange-500',
  },
];

export default function DataSourceStep({ onNext, initialSource }: DataSourceStepProps) {
  const [selected, setSelected] = useState<DataSource | null>(initialSource ?? null);

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <h2 className="text-lg font-semibold text-primary">Where should we search?</h2>
        <p className="text-sm text-muted mt-1">Choose which talent pool the AI will search through</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SOURCES.map((source) => {
          const isSelected = selected === source.id;
          return (
            <button
              key={source.id}
              onClick={() => setSelected(source.id)}
              className={`text-left p-5 rounded-2xl border-2 transition-all duration-200 group ${
                isSelected
                  ? 'border-accent-500/50 bg-accent-500/5 dark:bg-accent-500/5'
                  : 'border-gray-200/30 dark:border-dark-border/30 glass-panel-subtle hover:border-accent-500/20'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-11 h-11 rounded-xl bg-gradient-to-br ${source.gradient} flex items-center justify-center text-white flex-shrink-0`}
                >
                  {source.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-primary">{source.title}</h3>
                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-accent-500 flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted mt-1 leading-relaxed">{source.description}</p>
                  <span className="inline-block mt-2 px-2 py-0.5 text-[10px] font-mono font-medium bg-gray-100/50 dark:bg-dark-hover/50 text-secondary rounded-md">
                    {source.poolSize}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => selected && onNext(selected)}
        disabled={!selected}
        className="w-full py-3 px-6 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:from-emerald-500 disabled:hover:to-emerald-600"
      >
        Search This Pool
      </button>
    </div>
  );
}
