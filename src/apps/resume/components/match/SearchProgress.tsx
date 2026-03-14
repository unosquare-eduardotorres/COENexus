import { useState, useEffect, useMemo } from 'react';
import VectorAnimation from './VectorAnimation';

const SEARCH_MESSAGES = [
  'Initializing quantum data stream...',
  'Extracting metadata from quantum foam...',
  'Interfacing with requisition singularity...',
  'Deconstructing role into eigenstates...',
  'Mapping requirement vectors onto neural fabric...',
  'Calculating cosine similarity across dimensions...',
  'Infusing latent space with enriched context...',
  'Collapsing probability waves into results...',
];

interface SearchProgressComponentProps {
  progress: { percent: number; stage: string };
  isPaused?: boolean;
}

export default function SearchProgress({ progress, isPaused = false }: SearchProgressComponentProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  const targetIndex = useMemo(() => {
    const mapped = Math.floor((progress.percent / 100) * SEARCH_MESSAGES.length);
    return Math.min(mapped, SEARCH_MESSAGES.length - 1);
  }, [progress.percent]);

  useEffect(() => {
    if (currentMessageIndex < targetIndex) {
      const timer = setTimeout(() => {
        setCurrentMessageIndex((prev) => prev + 1);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [currentMessageIndex, targetIndex]);

  const shownMessages = SEARCH_MESSAGES.slice(0, currentMessageIndex);
  const currentMessage = SEARCH_MESSAGES[currentMessageIndex];

  return (
    <div className={`fixed inset-0 z-40 flex items-center justify-center transition-opacity duration-300 ${isPaused ? 'opacity-40' : 'opacity-100'}`}>
      <div className="absolute inset-0 bg-gray-950/80 backdrop-blur-sm" />
      <VectorAnimation isActive={!isPaused} />
      <div className="relative z-10 text-center max-w-lg px-8">
        <div className="space-y-1.5 mb-6 max-h-48 overflow-hidden">
          {shownMessages.map((msg, i) => (
            <p
              key={i}
              className="text-sm font-mono transition-opacity duration-300"
              style={{ color: `rgba(16, 185, 129, ${0.15 + (i / shownMessages.length) * 0.25})` }}
            >
              {msg}
            </p>
          ))}
        </div>

        <p className={`text-lg font-mono text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.5)] ${isPaused ? '' : 'animate-pulse'}`}>
          {isPaused ? 'Waiting for your decision...' : currentMessage}
        </p>

        <div className="mt-8 h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <span className="text-xs font-mono text-white/40 mt-2 block">{progress.percent}%</span>
      </div>
    </div>
  );
}
