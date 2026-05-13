import { useState, useEffect, useMemo } from 'react';
import { BenchOpenPosition } from '../../types';
import { benchBurnService } from '../../services/benchBurnService';
import SortableHeader, { useSort, sortData } from '../match/SortableHeader';
import { useTransformContext } from '../../contexts/TransformContext';

type PosSortKey = 'upstreamId' | 'account' | 'coe' | 'practice' | 'stakeholder' | 'mainSkill' | 'jobTitle';

function posAccessor(pos: BenchOpenPosition, key: string): string | number | null {
  switch (key) {
    case 'upstreamId': return pos.upstreamId;
    case 'account': return pos.account;
    case 'coe': return pos.coe;
    case 'practice': return pos.practice;
    case 'stakeholder': return pos.stakeholder;
    case 'mainSkill': return pos.mainSkill;
    case 'jobTitle': return pos.jobTitle;
    default: return null;
  }
}

export default function JobDescriptionStep() {
  const {
    jobDescription: { jobDescriptionSource, setJobDescriptionSource, customJobDescription, setCustomJobDescription },
    intent: { sourceType },
    selection: { selectedCandidate, selectedFiles },
    wizard: { handleBack, handleNextFromJobDescription },
  } = useTransformContext();

  const [positions, setPositions] = useState<BenchOpenPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [pickedPosition, setPickedPosition] = useState<BenchOpenPosition | null>(null);
  const { sortKey, sortDir, handleSort } = useSort<PosSortKey>('account');

  useEffect(() => {
    if (jobDescriptionSource !== 'positions') return;
    if (positions.length > 0) return;
    setLoading(true);
    benchBurnService.getOpenPositions()
      .then(data => { setPositions(data); setLoading(false); })
      .catch(err => { setLoadError(err.message); setLoading(false); });
  }, [jobDescriptionSource, positions.length]);

  const filtered = useMemo(() => {
    if (search.length < 3) return positions;
    const q = search.toLowerCase();
    return positions.filter(p =>
      p.account.toLowerCase().includes(q) ||
      p.coe.toLowerCase().includes(q) ||
      p.practice.toLowerCase().includes(q) ||
      p.stakeholder.toLowerCase().includes(q) ||
      p.mainSkill.toLowerCase().includes(q) ||
      p.jobTitle.toLowerCase().includes(q) ||
      p.upstreamId.toString().includes(q)
    );
  }, [positions, search]);

  const sorted = useMemo(
    () => sortData(filtered, sortKey, sortDir, posAccessor),
    [filtered, sortKey, sortDir]
  );

  const handleSelectPosition = (pos: BenchOpenPosition) => {
    if (pickedPosition?.upstreamId === pos.upstreamId) {
      setPickedPosition(null);
      setCustomJobDescription('');
    } else {
      setPickedPosition(pos);
      setCustomJobDescription(pos.jobDescription ?? '');
    }
  };

  const handleSwitchToCustom = () => {
    setJobDescriptionSource('custom');
    setPickedPosition(null);
    setCustomJobDescription('');
  };

  const handleSwitchToPositions = () => {
    setJobDescriptionSource('positions');
  };

  const canProceed = customJobDescription.trim().length > 0;

  return (
    <div className="glass-card p-6 mb-6">
      <h2 className="text-base font-semibold text-primary mb-1">Job Description Source</h2>
      <p className="text-sm text-muted mb-5">Provide a job description to tailor the resume toward a specific role.</p>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <button
          onClick={handleSwitchToPositions}
          className={`relative glass-card-hover p-5 text-left transition-all rounded-xl ${
            jobDescriptionSource === 'positions'
              ? 'ring-2 ring-accent-500 ring-offset-2 ring-offset-white dark:ring-offset-dark-card bg-accent-50/80 dark:bg-accent-500/15'
              : 'border border-transparent'
          }`}
        >
          {jobDescriptionSource === 'positions' && (
            <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-accent-500 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          <div className="w-9 h-9 rounded-lg bg-accent-500/10 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-accent-600 dark:text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-primary mb-1">From Synced Positions</h3>
          <p className="text-xs text-muted leading-relaxed">Select from active open positions in your ATS pipeline.</p>
        </button>

        <button
          onClick={handleSwitchToCustom}
          className={`relative glass-card-hover p-5 text-left transition-all rounded-xl ${
            jobDescriptionSource === 'custom'
              ? 'ring-2 ring-accent-500 ring-offset-2 ring-offset-white dark:ring-offset-dark-card bg-accent-50/80 dark:bg-accent-500/15'
              : 'border border-transparent'
          }`}
        >
          {jobDescriptionSource === 'custom' && (
            <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-accent-500 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          <div className="w-9 h-9 rounded-lg bg-accent-500/10 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-accent-600 dark:text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-primary mb-1">Custom Job Description</h3>
          <p className="text-xs text-muted leading-relaxed">Paste any job description to tailor the resume specifically to it.</p>
        </button>
      </div>

      {jobDescriptionSource === 'positions' && (
        <div className="mb-5">
          {loading && (
            <div className="glass-card-hover p-8 text-center rounded-xl">
              <div className="w-7 h-7 border-2 border-accent-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-muted">Loading open positions…</p>
            </div>
          )}

          {loadError && (
            <div className="glass-card-hover p-6 text-center rounded-xl">
              <p className="text-sm text-red-500">Failed to load positions: {loadError}</p>
            </div>
          )}

          {!loading && !loadError && (
            <>
              <div className="relative mb-3">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl glass-input text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                  placeholder="Search positions (min 3 characters)…"
                />
              </div>

              <div className="overflow-x-auto max-h-64 overflow-y-auto rounded-xl border border-gray-200/20 dark:border-dark-border/20">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white/80 dark:bg-dark-card/90 backdrop-blur-sm z-10">
                    <tr className="border-b border-gray-200/30 dark:border-dark-border/30">
                      <SortableHeader<PosSortKey> label="ID" sortKey="upstreamId" currentSortKey={sortKey} currentDirection={sortDir} onSort={handleSort} />
                      <SortableHeader<PosSortKey> label="Account" sortKey="account" currentSortKey={sortKey} currentDirection={sortDir} onSort={handleSort} />
                      <SortableHeader<PosSortKey> label="COE" sortKey="coe" currentSortKey={sortKey} currentDirection={sortDir} onSort={handleSort} />
                      <SortableHeader<PosSortKey> label="Practice" sortKey="practice" currentSortKey={sortKey} currentDirection={sortDir} onSort={handleSort} />
                      <SortableHeader<PosSortKey> label="Stakeholder" sortKey="stakeholder" currentSortKey={sortKey} currentDirection={sortDir} onSort={handleSort} />
                      <SortableHeader<PosSortKey> label="Main Skill" sortKey="mainSkill" currentSortKey={sortKey} currentDirection={sortDir} onSort={handleSort} />
                      <SortableHeader<PosSortKey> label="Job Title" sortKey="jobTitle" currentSortKey={sortKey} currentDirection={sortDir} onSort={handleSort} />
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map(pos => {
                      const isSelected = pickedPosition?.upstreamId === pos.upstreamId;
                      return (
                        <tr
                          key={pos.upstreamId}
                          onClick={() => handleSelectPosition(pos)}
                          className={`border-b border-gray-100/20 dark:border-dark-border/20 transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-accent-500/10'
                              : 'hover:bg-white/5'
                          }`}
                        >
                          <td className="py-2 px-2 font-mono text-xs text-muted">{pos.upstreamId}</td>
                          <td className="py-2 px-2 font-medium text-primary">{pos.account}</td>
                          <td className="py-2 px-2 text-secondary">{pos.coe}</td>
                          <td className="py-2 px-2 text-secondary">{pos.practice}</td>
                          <td className="py-2 px-2 text-muted">{pos.stakeholder}</td>
                          <td className="py-2 px-2">
                            <span className="px-2 py-0.5 text-xs rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                              {pos.mainSkill}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-secondary">{pos.jobTitle}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {sorted.length === 0 && (
                <p className="text-center text-sm text-muted py-4">
                  {search.length >= 3 ? 'No positions match your search.' : positions.length === 0 ? 'No open positions found.' : 'Type at least 3 characters to filter positions.'}
                </p>
              )}

              {pickedPosition && (
                <div className="mt-4 p-4 rounded-xl border border-accent-500/20 bg-accent-500/5">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-primary">
                      {pickedPosition.jobTitle} — {pickedPosition.account}
                    </h4>
                    <span className="text-xs font-mono text-muted">ID {pickedPosition.upstreamId}</span>
                  </div>
                  {pickedPosition.jobDescription ? (
                    <p className="text-xs text-secondary leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {pickedPosition.jobDescription}
                    </p>
                  ) : (
                    <p className="text-xs text-muted italic">No job description available for this position.</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {jobDescriptionSource === 'custom' && (
        <div className="mb-5">
          <textarea
            className="glass-input w-full text-sm resize-none"
            rows={8}
            value={customJobDescription}
            onChange={(e) => setCustomJobDescription(e.target.value)}
            placeholder="Paste the job description here..."
          />
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-secondary bg-white/50 dark:bg-dark-hover/50 rounded-xl hover:bg-white/80 dark:hover:bg-dark-hover transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
          </svg>
          Back
        </button>
        <button
          onClick={handleNextFromJobDescription}
          disabled={!canProceed}
          className="flex items-center gap-2 px-5 py-2.5 bg-accent-500 text-white text-sm font-medium rounded-xl hover:bg-accent-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
          Enhance{' '}
          {sourceType === 'ats-candidates' && selectedCandidate
            ? `${selectedCandidate.name}'s Resume`
            : `${selectedFiles.length} Resume${selectedFiles.length !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  );
}
