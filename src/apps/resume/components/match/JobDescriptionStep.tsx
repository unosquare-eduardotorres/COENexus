import { useState, useMemo, useEffect } from 'react';
import { JdSource, BenchOpenPosition } from '../../types';
import { SAMPLE_JOB_DESCRIPTION } from '../../data/sampleJobDescription';
import { benchBurnService } from '../../services/benchBurnService';

interface JobDescriptionStepProps {
  onNext: (jobDescription: string, source: JdSource) => void;
  initialJobDescription?: string;
  initialSource?: JdSource;
}

function generateJdFromPosition(position: BenchOpenPosition): string {
  return `${position.jobTitle} – ${position.account}\n\nVertical: ${position.practice}\nStakeholder: ${position.stakeholder}\n\nMain Skill: ${position.mainSkill}${position.jobDescription ? `\n\n${position.jobDescription}` : ''}`;
}

export default function JobDescriptionStep({
  onNext,
  initialJobDescription = SAMPLE_JOB_DESCRIPTION,
  initialSource = 'custom',
}: JobDescriptionStepProps) {
  const [activeTab, setActiveTab] = useState<JdSource>(initialSource);
  const [customJd, setCustomJd] = useState(initialJobDescription);
  const [selectedPositionId, setSelectedPositionId] = useState<number | null>(null);
  const [positionSearch, setPositionSearch] = useState('');
  const [positions, setPositions] = useState<BenchOpenPosition[]>([]);
  const [loadingPositions, setLoadingPositions] = useState(false);

  useEffect(() => {
    setLoadingPositions(true);
    benchBurnService.getOpenPositions()
      .then(setPositions)
      .catch(() => setPositions([]))
      .finally(() => setLoadingPositions(false));
  }, []);

  const filteredPositions = useMemo(() => {
    if (!positionSearch.trim()) return positions;
    const query = positionSearch.toLowerCase();
    return positions.filter(
      (p) =>
        p.jobTitle.toLowerCase().includes(query) ||
        p.account.toLowerCase().includes(query) ||
        p.mainSkill.toLowerCase().includes(query) ||
        p.practice.toLowerCase().includes(query)
    );
  }, [positions, positionSearch]);

  const selectedPosition = useMemo(
    () => positions.find((p) => p.id === selectedPositionId) ?? null,
    [positions, selectedPositionId]
  );

  const generatedJd = useMemo(
    () => (selectedPosition ? generateJdFromPosition(selectedPosition) : ''),
    [selectedPosition]
  );

  const currentJd = activeTab === 'custom' ? customJd : generatedJd;
  const isDisabled = !currentJd.trim();

  const handleContinue = () => {
    if (!isDisabled) {
      onNext(currentJd, activeTab);
    }
  };

  return (
    <div className="space-y-4">
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h2 className="text-sm font-semibold text-primary">Job Description</h2>
        </div>

        <div className="flex gap-1 p-1 rounded-xl bg-gray-100/50 dark:bg-dark-hover/50 mb-5">
          <button
            onClick={() => setActiveTab('position')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'position'
                ? 'bg-white dark:bg-dark-card text-primary shadow-sm'
                : 'text-muted hover:text-secondary'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Select Position
            </span>
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'custom'
                ? 'bg-white dark:bg-dark-card text-primary shadow-sm'
                : 'text-muted hover:text-secondary'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Paste Custom
            </span>
          </button>
        </div>

        {activeTab === 'position' && (
          <div className="space-y-3">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                value={positionSearch}
                onChange={(e) => setPositionSearch(e.target.value)}
                placeholder="Search positions by title, account, skills..."
                className="glass-input w-full pl-10 text-sm text-primary placeholder:text-muted"
              />
            </div>

            <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
              {loadingPositions ? (
                <div className="text-center py-8 text-sm text-muted">Loading positions...</div>
              ) : filteredPositions.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted">No positions found.</div>
              ) : (
                filteredPositions.map((position) => {
                  const isSelected = selectedPositionId === position.id;
                  return (
                    <button
                      key={position.id}
                      onClick={() => setSelectedPositionId(isSelected ? null : position.id)}
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                        isSelected
                          ? 'border-indigo-500/50 bg-indigo-500/10 dark:bg-indigo-500/10'
                          : 'border-gray-200/30 dark:border-dark-border/30 glass-panel-subtle hover:border-indigo-500/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-primary">{position.jobTitle}</div>
                          <div className="text-xs text-muted mt-0.5">{position.account} · {position.practice}</div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-md">
                              {position.mainSkill}
                            </span>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-500'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {selectedPosition && (
              <div className="mt-3 p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-1">Generated Job Description Preview</div>
                <p className="text-xs text-muted line-clamp-3">{generatedJd}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'custom' && (
          <div>
            <textarea
              className="glass-input w-full resize-none text-sm text-primary placeholder:text-muted"
              rows={10}
              value={customJd}
              onChange={(e) => setCustomJd(e.target.value)}
              placeholder="Paste the job description here to find matching candidates..."
            />
            <div className="mt-2 text-right">
              <span className="text-xs font-mono text-muted">{customJd.length} characters</span>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={handleContinue}
        disabled={isDisabled}
        className="w-full py-3 px-6 bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 text-white rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:from-accent-500 disabled:hover:to-accent-600"
      >
        Continue
      </button>
    </div>
  );
}
