import { useState, useCallback } from 'react';
import { BenchOpenPosition } from '../../types';
import BenchPositionSelector from './BenchPositionSelector';

type PositionMode = 'select' | 'custom';

interface ExternalPositionStepProps {
  onNext: (position: BenchOpenPosition | null, customPosition: { name: string; jd: string } | null) => void;
  initialPosition?: BenchOpenPosition | null;
  initialCustomPosition?: { name: string; jd: string } | null;
}

export default function ExternalPositionStep({
  onNext,
  initialPosition = null,
  initialCustomPosition = null,
}: ExternalPositionStepProps) {
  const [mode, setMode] = useState<PositionMode>(initialCustomPosition ? 'custom' : 'select');
  const [jobTitle, setJobTitle] = useState(initialCustomPosition?.name ?? '');
  const [jobDescription, setJobDescription] = useState(initialCustomPosition?.jd ?? '');

  const isCustomValid = jobTitle.trim().length > 0 && jobDescription.trim().length >= 50;

  const handleSelectorNext = useCallback((positions: BenchOpenPosition[]) => {
    if (positions.length > 0) {
      onNext(positions[0], null);
    }
  }, [onNext]);

  const handleCustomContinue = useCallback(() => {
    if (!isCustomValid) return;
    onNext(null, { name: jobTitle.trim(), jd: jobDescription.trim() });
  }, [isCustomValid, jobTitle, jobDescription, onNext]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-1 rounded-xl glass-card w-fit">
        <button
          onClick={() => setMode('select')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            mode === 'select'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25'
              : 'text-muted hover:text-secondary'
          }`}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Select Open Position
          </span>
        </button>
        <button
          onClick={() => setMode('custom')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            mode === 'custom'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25'
              : 'text-muted hover:text-secondary'
          }`}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Paste Job Description
          </span>
        </button>
      </div>

      {mode === 'select' && (
        <BenchPositionSelector
          onNext={handleSelectorNext}
          initialSelected={initialPosition ? [initialPosition] : []}
          singleSelect
        />
      )}

      {mode === 'custom' && (
        <div className="glass-card rounded-2xl p-6 space-y-5">
          <div>
            <h3 className="text-lg font-bold text-primary mb-1">Custom Job Description</h3>
            <p className="text-sm text-secondary">
              Paste the job title and description to match against uploaded resumes.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-1.5">
                Job Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                placeholder="e.g., Senior Full-Stack Developer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1.5">
                Job Description <span className="text-red-400">*</span>
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={10}
                className="w-full px-4 py-3 rounded-xl glass-input text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-cyan-500/30 resize-y"
                placeholder="Paste the full job description here (minimum 50 characters)..."
              />
              <p className={`text-xs mt-1 ${jobDescription.trim().length >= 50 ? 'text-emerald-400' : 'text-muted'}`}>
                {jobDescription.trim().length}/50 characters minimum
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleCustomContinue}
              disabled={!isCustomValid}
              className="px-6 py-2.5 text-sm font-medium rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:shadow-lg hover:shadow-cyan-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
