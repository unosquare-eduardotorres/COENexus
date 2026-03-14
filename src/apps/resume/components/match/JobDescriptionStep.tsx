import { useState, useMemo } from 'react';
import { ATSPosition, JdSource, HardConstraints, FilterOptions } from '../../types';
import { mockATSCandidates } from '../../data/mockATSCandidates';
import { SAMPLE_JOB_DESCRIPTION } from '../../data/mockMatchCandidates';

interface JobDescriptionStepProps {
  onNext: (jobDescription: string, source: JdSource, constraints: HardConstraints) => void;
  initialJobDescription?: string;
  initialSource?: JdSource;
  initialConstraints?: HardConstraints;
  filterOptions: FilterOptions | null;
}

interface FlattenedPosition extends ATSPosition {
  candidateName: string;
}

function generateJdFromPosition(position: ATSPosition): string {
  const skills = position.requiredSkills.join(', ');
  const seniorities = position.seniorities.join(' / ');
  return `${position.title} – ${position.accountName}\n\nWe are looking for a ${seniorities} level professional to fill the ${position.title} role.\n\nVertical: ${position.vertical}\nStakeholder: ${position.stakeholder}\n\nRequired Skills:\n${position.requiredSkills.map((s) => `• ${s}`).join('\n')}\n\nSeniority: ${seniorities}\nRate Range: $${position.minRate}/hr - $${position.maxRate}/hr\n\nKey Technologies: ${skills}`;
}

export default function JobDescriptionStep({
  onNext,
  initialJobDescription = SAMPLE_JOB_DESCRIPTION,
  initialSource = 'custom',
  initialConstraints = {},
  filterOptions,
}: JobDescriptionStepProps) {
  const [activeTab, setActiveTab] = useState<JdSource>(initialSource);
  const [customJd, setCustomJd] = useState(initialJobDescription);
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null);
  const [positionSearch, setPositionSearch] = useState('');
  const [constraints, setConstraints] = useState<HardConstraints>(initialConstraints);
  const [isConstraintsOpen, setIsConstraintsOpen] = useState(
    Boolean(initialConstraints.seniority || initialConstraints.salary || initialConstraints.salaryCurrency || initialConstraints.country || initialConstraints.mainSkill)
  );

  const activeConstraintCount = useMemo(() => {
    let count = 0;
    if (constraints.seniority) count++;
    if (constraints.mainSkill) count++;
    if (constraints.salary) count++;
    if (constraints.salaryCurrency) count++;
    if (constraints.country) count++;
    return count;
  }, [constraints]);

  const allPositions = useMemo<FlattenedPosition[]>(() => {
    const positions: FlattenedPosition[] = [];
    mockATSCandidates.forEach((candidate) => {
      candidate.positions.forEach((pos) => {
        positions.push({ ...pos, candidateName: candidate.name });
      });
    });
    return positions;
  }, []);

  const filteredPositions = useMemo(() => {
    if (!positionSearch.trim()) return allPositions;
    const query = positionSearch.toLowerCase();
    return allPositions.filter(
      (p) =>
        p.title.toLowerCase().includes(query) ||
        p.accountName.toLowerCase().includes(query) ||
        p.requiredSkills.some((s) => s.toLowerCase().includes(query)) ||
        p.vertical.toLowerCase().includes(query)
    );
  }, [allPositions, positionSearch]);

  const selectedPosition = useMemo(
    () => allPositions.find((p) => p.id === selectedPositionId) ?? null,
    [allPositions, selectedPositionId]
  );

  const generatedJd = useMemo(
    () => (selectedPosition ? generateJdFromPosition(selectedPosition) : ''),
    [selectedPosition]
  );

  const currentJd = activeTab === 'custom' ? customJd : generatedJd;
  const isDisabled = !currentJd.trim();

  const handleContinue = () => {
    if (!isDisabled) {
      onNext(currentJd, activeTab, constraints);
    }
  };

  const handleClearConstraints = () => {
    setConstraints({});
  };

  return (
    <div className="space-y-4">
      <div className="glass-card overflow-hidden">
        <button
          onClick={() => setIsConstraintsOpen(!isConstraintsOpen)}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            <span className="text-sm font-semibold text-primary">Hard Requirements</span>
            {activeConstraintCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full">
                {activeConstraintCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeConstraintCount > 0 && !isConstraintsOpen && (
              <div className="flex flex-wrap gap-1">
                {constraints.seniority && (
                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100/50 dark:bg-dark-hover/50 text-secondary rounded-md">
                    {constraints.seniority}
                  </span>
                )}
                {constraints.mainSkill && (
                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100/50 dark:bg-dark-hover/50 text-secondary rounded-md">
                    {constraints.mainSkill}
                  </span>
                )}
                {constraints.salary && (
                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100/50 dark:bg-dark-hover/50 text-secondary rounded-md">
                    {constraints.salaryOperator === 'gte' ? '≥' : '≤'} ${constraints.salary}
                  </span>
                )}
                {constraints.salaryCurrency && (
                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100/50 dark:bg-dark-hover/50 text-secondary rounded-md">
                    {constraints.salaryCurrency}
                  </span>
                )}
                {constraints.country && (
                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100/50 dark:bg-dark-hover/50 text-secondary rounded-md">
                    {constraints.country}
                  </span>
                )}
              </div>
            )}
            <svg
              className={`w-4 h-4 text-muted transition-transform duration-200 ${isConstraintsOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {isConstraintsOpen && (
          <div className="px-4 pb-4 border-t border-gray-200/20 dark:border-dark-border/20 pt-4">
            <p className="text-xs text-muted mb-4">
              SQL-level constraints applied before the semantic search. Only candidates matching ALL active constraints will be considered.
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">Seniority</label>
                <select
                  value={constraints.seniority ?? ''}
                  onChange={(e) => setConstraints((prev) => ({ ...prev, seniority: e.target.value || undefined }))}
                  className="glass-input w-full text-sm text-primary"
                >
                  <option value="">Any</option>
                  {filterOptions?.seniorities.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">Main Skill</label>
                <select
                  value={constraints.mainSkill ?? ''}
                  onChange={(e) => setConstraints((prev) => ({ ...prev, mainSkill: e.target.value || undefined }))}
                  className="glass-input w-full text-sm text-primary"
                >
                  <option value="">Any</option>
                  {filterOptions?.mainSkills.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">Country</label>
                <select
                  value={constraints.country ?? ''}
                  onChange={(e) => setConstraints((prev) => ({ ...prev, country: e.target.value || undefined }))}
                  className="glass-input w-full text-sm text-primary"
                >
                  <option value="">Any</option>
                  {filterOptions?.countries.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">Salary</label>
                <input
                  type="number"
                  min={0}
                  value={constraints.salary ?? ''}
                  onChange={(e) => setConstraints((prev) => ({ ...prev, salary: e.target.value ? Number(e.target.value) : undefined }))}
                  placeholder="No limit"
                  className="glass-input w-full text-sm text-primary placeholder:text-muted"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">Operator</label>
                <div className="flex gap-1">
                  <button
                    onClick={() => setConstraints((prev) => ({ ...prev, salaryOperator: 'lte' }))}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                      (constraints.salaryOperator ?? 'lte') === 'lte'
                        ? 'bg-accent-500/20 text-accent-600 dark:text-accent-400 border border-accent-500/30'
                        : 'glass-panel-subtle text-muted hover:text-secondary'
                    }`}
                  >
                    ≤ Less or Equal
                  </button>
                  <button
                    onClick={() => setConstraints((prev) => ({ ...prev, salaryOperator: 'gte' }))}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                      constraints.salaryOperator === 'gte'
                        ? 'bg-accent-500/20 text-accent-600 dark:text-accent-400 border border-accent-500/30'
                        : 'glass-panel-subtle text-muted hover:text-secondary'
                    }`}
                  >
                    ≥ Greater or Equal
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">Salary Currency</label>
                <select
                  value={constraints.salaryCurrency ?? ''}
                  onChange={(e) => setConstraints((prev) => ({ ...prev, salaryCurrency: e.target.value || undefined }))}
                  className="glass-input w-full text-sm text-primary"
                >
                  <option value="">Any</option>
                  {filterOptions?.currencies.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {activeConstraintCount > 0 && (
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200/10 dark:border-dark-border/10">
                <div className="flex flex-wrap gap-1">
                  {constraints.seniority && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
                      {constraints.seniority}
                    </span>
                  )}
                  {constraints.mainSkill && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
                      {constraints.mainSkill}
                    </span>
                  )}
                  {constraints.salary && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
                      {constraints.salaryOperator === 'gte' ? '≥' : '≤'} ${constraints.salary}
                    </span>
                  )}
                  {constraints.salaryCurrency && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
                      {constraints.salaryCurrency}
                    </span>
                  )}
                  {constraints.country && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
                      {constraints.country}
                    </span>
                  )}
                </div>
                <button
                  onClick={handleClearConstraints}
                  className="text-xs text-muted hover:text-red-500 transition-colors"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        )}
      </div>

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
              {filteredPositions.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted">No positions found matching your search.</div>
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
                          <div className="font-semibold text-sm text-primary">{position.title}</div>
                          <div className="text-xs text-muted mt-0.5">{position.accountName} · {position.vertical}</div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {position.requiredSkills.map((skill) => (
                              <span
                                key={skill}
                                className="px-1.5 py-0.5 text-[10px] font-medium bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-md"
                              >
                                {skill}
                              </span>
                            ))}
                            {position.seniorities.map((s) => (
                              <span
                                key={s}
                                className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100/50 dark:bg-dark-hover/50 text-secondary rounded-md"
                              >
                                {s}
                              </span>
                            ))}
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
