import { useEffect, useState } from 'react';

interface TransformProgressOverlayProps {
  progress: { current: number; total: number; currentFile: string };
  phase: 'extracting' | 'enhancing' | null;
}

const PHASE_CONFIG = [
  { key: 'reading', label: 'Reading Document', icon: '📄', detail: 'Parsing file contents…' },
  { key: 'extracting', label: 'Extracting Resume Data', icon: '⚙️', detail: 'Identifying sections, skills, and experience…' },
  { key: 'enhancing', label: 'AI Enhancement', icon: '✨', detail: 'Polishing language and optimizing content…' },
  { key: 'template', label: 'Applying Template', icon: '📋', detail: 'Formatting into Unosquare template…' },
] as const;

const ROTATING_MESSAGES = [
  'Analyzing resume sections…',
  'Identifying key technologies…',
  'Optimizing for professional impact…',
  'Selecting top template skills…',
  'Evaluating career progression…',
  'Structuring achievements…',
  'Mapping cloud & AI competencies…',
  'Refining professional summary…',
];

function getActivePhaseIndex(phase: 'extracting' | 'enhancing' | null): number {
  if (!phase) return 0;
  if (phase === 'extracting') return 1;
  return 2;
}

export default function TransformProgressOverlay({ progress, phase }: TransformProgressOverlayProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const activeIdx = getActivePhaseIndex(phase);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % ROTATING_MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const progressPercent = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <div className="glass-card p-8 flex-1 flex flex-col items-center justify-center min-h-[400px]">
      <div className="w-20 h-20 relative mb-8 animate-float">
        <svg className="w-20 h-20 text-accent-500/20" viewBox="0 0 80 80" fill="none">
          <rect x="16" y="8" width="48" height="64" rx="4" stroke="currentColor" strokeWidth="2" />
          <line x1="26" y1="24" x2="54" y2="24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="26" y1="32" x2="54" y2="32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="26" y1="40" x2="46" y2="40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="26" y1="48" x2="50" y2="48" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="26" y1="56" x2="42" y2="56" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <div className="absolute -top-1 -right-1 animate-sparkle">
          <svg className="w-6 h-6 text-violet-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
          </svg>
        </div>
        <div className="absolute -bottom-1 -left-1 animate-sparkle" style={{ animationDelay: '1s' }}>
          <svg className="w-4 h-4 text-accent-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
          </svg>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        {PHASE_CONFIG.map((p, i) => (
          <div key={p.key} className="flex items-center gap-1.5">
            <div
              className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${
                i < activeIdx
                  ? 'bg-emerald-500'
                  : i === activeIdx
                    ? 'bg-accent-500 ring-4 ring-accent-500/20 animate-pulse'
                    : 'bg-gray-300 dark:bg-dark-border'
              }`}
            />
            {i < PHASE_CONFIG.length - 1 && (
              <div
                className={`w-8 h-0.5 rounded transition-all duration-500 ${
                  i < activeIdx ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-dark-border'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-1.5">
          <span className="text-lg">{PHASE_CONFIG[activeIdx].icon}</span>
          <h3 className="text-base font-semibold text-primary">{PHASE_CONFIG[activeIdx].label}</h3>
        </div>
        <p className="text-sm text-muted mb-2">{PHASE_CONFIG[activeIdx].detail}</p>
        <p
          className="text-xs text-accent-500 dark:text-accent-400 transition-opacity duration-500"
          key={messageIndex}
        >
          {ROTATING_MESSAGES[messageIndex]}
        </p>
      </div>

      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between text-xs text-muted mb-1.5">
          <span className="truncate max-w-[200px]" title={progress.currentFile}>{progress.currentFile}</span>
          <span>{progress.current}/{progress.total}</span>
        </div>
        <div className="w-full h-2 bg-gray-100 dark:bg-dark-border rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent-500 to-violet-500 transition-all duration-700 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
