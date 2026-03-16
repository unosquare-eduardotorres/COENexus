import { useState } from 'react';
import { SearchMode, TopN } from '../../types';

interface SearchDepthStepProps {
  onNext: (mode: SearchMode, topN: number) => void;
  initialMode?: SearchMode;
}

const TOP_N_OPTIONS: { value: TopN; label: string; tier: string; gradient: string; description: string }[] = [
  { value: 1, label: 'Top 1', tier: 'Diamond', gradient: 'from-cyan-300 to-blue-500', description: 'Single best match' },
  { value: 10, label: 'Top 10', tier: 'Gold', gradient: 'from-amber-400 to-yellow-500', description: 'Best matches, fastest results' },
  { value: 20, label: 'Top 20', tier: 'Silver', gradient: 'from-gray-300 to-gray-400', description: 'Balanced depth and speed' },
  { value: 30, label: 'Top 30', tier: 'Bronze', gradient: 'from-orange-400 to-amber-600', description: 'Maximum coverage' },
];

interface ModeOption {
  id: SearchMode;
  title: string;
  badge: string;
  badgeClass: string;
  description: string;
  defaultTopN: number;
  topNEditable: boolean;
  icon: JSX.Element;
  gradient: string;
  stages: string[];
}

const MODES: ModeOption[] = [
  {
    id: 'vector',
    title: 'Vector Search',
    badge: '⚡ Fastest',
    badgeClass: 'bg-emerald-500/15 text-emerald-400',
    description: 'Pure semantic similarity search. Returns the top 200 profiles ranked by how closely their resume matches your job description. No AI filtering — raw vector proximity.',
    defaultTopN: 200,
    topNEditable: false,
    gradient: 'from-emerald-500 to-green-500',
    stages: ['Vector DB'],
    icon: (
      <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="4" x2="11" y2="8" />
        <line x1="4" y1="4" x2="8" y2="14" />
        <line x1="11" y1="8" x2="20" y2="5" />
        <line x1="11" y1="8" x2="8" y2="14" />
        <line x1="11" y1="8" x2="17" y2="13" />
        <line x1="20" y1="5" x2="17" y2="13" />
        <line x1="8" y1="14" x2="17" y2="13" />
        <line x1="8" y1="14" x2="6" y2="20" />
        <line x1="8" y1="14" x2="15" y2="19" />
        <line x1="17" y1="13" x2="15" y2="19" />
        <line x1="6" y1="20" x2="15" y2="19" />
        <circle cx="4" cy="4" r="1.5" fill="currentColor" />
        <circle cx="11" cy="8" r="1.8" fill="currentColor" />
        <circle cx="20" cy="5" r="1.3" fill="currentColor" />
        <circle cx="8" cy="14" r="1.8" fill="currentColor" />
        <circle cx="17" cy="13" r="1.5" fill="currentColor" />
        <circle cx="6" cy="20" r="1.3" fill="currentColor" />
        <circle cx="15" cy="19" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'haiku',
    title: 'Haiku Pre-filter',
    badge: '🎯 Balanced',
    badgeClass: 'bg-amber-500/15 text-amber-400',
    description: 'Searches the vector DB then applies Claude Haiku AI triage to score each candidate\'s relevance. Filters out poor matches before showing results.',
    defaultTopN: 50,
    topNEditable: true,
    gradient: 'from-amber-500 to-orange-500',
    stages: ['Vector DB', 'Haiku AI'],
    icon: (
      <svg className="w-9 h-9" viewBox="0 0 24 24">
        <text x="12" y="17" textAnchor="middle" fill="currentColor" fontSize="18" fontWeight="bold" fontFamily="serif">句</text>
      </svg>
    ),
  },
  {
    id: 'opus',
    title: 'Full Analysis',
    badge: '🔬 Deepest',
    badgeClass: 'bg-violet-500/15 text-violet-400',
    description: 'The complete pipeline. Vector search → Haiku triage → Claude Sonnet deep analysis with fit narratives, skill gaps, leadership assessment, and risk factors.',
    defaultTopN: 10,
    topNEditable: false,
    gradient: 'from-violet-500 to-purple-500',
    stages: ['Vector DB', 'Haiku AI', 'Sonnet Deep Analysis'],
    icon: (
      <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 3c-1.1 0-2 .9-2 2v1c0 1.1.9 2 2 2h1v10c0 1.1-.9 2-2 2s-2-.9-2-2" />
        <path d="M7 8h8a2 2 0 012 2v8a2 2 0 01-2 2H5" />
        <path d="M7 3h10a2 2 0 012 2v1a2 2 0 01-2 2H7" />
        <line x1="9" y1="12" x2="15" y2="12" />
        <line x1="9" y1="15" x2="13" y2="15" />
        <path d="M19 2l-3.5 3.5M15.5 5.5l2 2L21 4l-2-2z" />
        <path d="M15.5 5.5L14 10l4.5-1.5" />
      </svg>
    ),
  },
];

const FUNNEL_STAGES = ['Vector DB', 'Haiku Filter', 'Sonnet Analysis'];

function getActiveStageCount(mode: SearchMode): number {
  if (mode === 'vector') return 1;
  if (mode === 'haiku') return 2;
  return 3;
}

export default function SearchDepthStep({ onNext, initialMode }: SearchDepthStepProps) {
  const [selected, setSelected] = useState<SearchMode>(initialMode ?? 'opus');
  const [haikuTopN, setHaikuTopN] = useState(50);
  const [opusTopN, setOpusTopN] = useState<TopN>(10);

  const activeCount = getActiveStageCount(selected);

  const getTopN = (): number => {
    if (selected === 'vector') return 200;
    if (selected === 'haiku') return haikuTopN;
    return opusTopN;
  };

  const getModeLabel = (): string => {
    const mode = MODES.find((m) => m.id === selected);
    return mode?.title ?? selected;
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <h2 className="text-lg font-semibold text-primary">How deep should we search?</h2>
        <p className="text-sm text-muted mt-1">Choose the level of AI analysis — faster searches return more raw results, deeper searches return fewer but richer insights</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {MODES.map((mode) => {
          const isSelected = selected === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => setSelected(mode.id)}
              className={`text-left p-5 rounded-2xl border-2 transition-all duration-200 group ${
                isSelected
                  ? 'border-accent-500/50 bg-accent-500/5 dark:bg-accent-500/5'
                  : 'border-gray-200/30 dark:border-dark-border/30 glass-panel-subtle hover:border-accent-500/20'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${mode.gradient} flex items-center justify-center text-white flex-shrink-0`}>
                  {mode.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold text-primary">{mode.title}</h3>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${mode.badgeClass}`}>
                      {mode.badge}
                    </span>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-accent-500 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted mt-1.5 leading-relaxed">{mode.description}</p>

                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {mode.stages.map((stage) => (
                      <span key={stage} className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        isSelected
                          ? 'bg-accent-500/15 text-accent-500'
                          : 'bg-gray-200/20 dark:bg-dark-border/20 text-muted'
                      }`}>
                        {stage}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {selected === 'haiku' && (
        <div className="flex items-center justify-center gap-3">
          <span className="text-sm text-secondary">Results to return:</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setHaikuTopN(Math.max(10, haikuTopN - 10))}
              className="w-8 h-8 rounded-lg glass-panel-subtle flex items-center justify-center text-muted hover:text-primary transition-colors"
            >
              −
            </button>
            <span className="w-12 text-center text-lg font-bold text-primary font-mono">{haikuTopN}</span>
            <button
              onClick={() => setHaikuTopN(Math.min(100, haikuTopN + 10))}
              className="w-8 h-8 rounded-lg glass-panel-subtle flex items-center justify-center text-muted hover:text-primary transition-colors"
            >
              +
            </button>
          </div>
        </div>
      )}

      {selected === 'opus' && (
        <div>
          <h3 className="text-sm font-semibold text-primary mb-3 text-center">How many candidates to deep-analyze?</h3>
          <div className="grid grid-cols-4 gap-3">
            {TOP_N_OPTIONS.map((option) => {
              const isActive = opusTopN === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setOpusTopN(option.value)}
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
      )}

      <div className="glass-panel-subtle rounded-xl p-4">
        <div className="flex items-center justify-between gap-2">
          {FUNNEL_STAGES.map((stage, i) => {
            const isActive = i < activeCount;
            return (
              <div key={stage} className="flex items-center gap-2 flex-1">
                <div className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-accent-500/10 text-accent-500 border border-accent-500/20'
                    : 'bg-gray-200/10 dark:bg-dark-border/10 text-muted/40 border border-transparent'
                }`}>
                  {isActive && (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {stage}
                </div>
                {i < FUNNEL_STAGES.length - 1 && (
                  <svg className={`w-4 h-4 flex-shrink-0 ${i < activeCount - 1 ? 'text-accent-500' : 'text-muted/20'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={() => onNext(selected, getTopN())}
        className="w-full py-3 px-6 bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 text-white rounded-xl font-semibold text-sm transition-all duration-200"
      >
        Continue with {getModeLabel()} ({getTopN()} records)
      </button>
    </div>
  );
}
