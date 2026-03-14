import { useState, useMemo } from 'react';
import { PipelineStageCandidateDto, PipelineStageKey } from '../../types';

interface PipelineStageDrawerProps {
  stage: PipelineStageKey;
  stageLabel: string;
  candidates: PipelineStageCandidateDto[];
  onClose: () => void;
}

type SortField = 'cosineSimilarity' | 'name' | 'haikuScore';
type SortDir = 'asc' | 'desc';

export default function PipelineStageDrawer({ stage, stageLabel, candidates, onClose }: PipelineStageDrawerProps) {
  const [sortField, setSortField] = useState<SortField>('cosineSimilarity');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filterKept, setFilterKept] = useState<'all' | 'kept' | 'eliminated'>('all');

  const keptCount = useMemo(() => candidates.filter((c) => !c.eliminationReason).length, [candidates]);
  const eliminatedCount = candidates.length - keptCount;

  const filtered = useMemo(() => {
    let list = [...candidates];
    if (filterKept === 'kept') list = list.filter((c) => !c.eliminationReason);
    if (filterKept === 'eliminated') list = list.filter((c) => !!c.eliminationReason);

    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'cosineSimilarity') cmp = a.cosineSimilarity - b.cosineSimilarity;
      else if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'haikuScore') cmp = (a.haikuScore ?? 0) - (b.haikuScore ?? 0);
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return list;
  }, [candidates, filterKept, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const sortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDir === 'desc' ? '↓' : '↑';
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-[var(--color-bg-primary)] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-bold text-primary">{stageLabel}</h2>
            <p className="text-sm text-secondary mt-0.5">
              <span className="font-mono font-semibold text-primary">{candidates.length}</span> candidates
              {eliminatedCount > 0 && (
                <>
                  {' · '}
                  <span className="text-emerald-500 font-mono">{keptCount}</span> kept
                  {' · '}
                  <span className="text-red-400 font-mono">{eliminatedCount}</span> eliminated
                </>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/5 text-muted hover:text-secondary transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {eliminatedCount > 0 && (
          <div className="flex items-center gap-2 px-6 py-3 border-b border-white/5">
            {(['all', 'kept', 'eliminated'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilterKept(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filterKept === f
                    ? 'bg-accent-500/20 text-accent-500'
                    : 'text-muted hover:text-secondary hover:bg-white/5'
                }`}
              >
                {f === 'all' ? `All (${candidates.length})` : f === 'kept' ? `Kept (${keptCount})` : `Eliminated (${eliminatedCount})`}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[var(--color-bg-primary)] z-10">
              <tr className="border-b border-white/10">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted uppercase tracking-wider">
                  <button onClick={() => handleSort('name')} className="flex items-center gap-1 hover:text-secondary">
                    Name {sortIcon('name')}
                  </button>
                </th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted uppercase tracking-wider">Source</th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted uppercase tracking-wider">
                  <button onClick={() => handleSort('cosineSimilarity')} className="flex items-center gap-1 ml-auto hover:text-secondary">
                    Similarity {sortIcon('cosineSimilarity')}
                  </button>
                </th>
                {stage === 'afterHaikuTriage' && (
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted uppercase tracking-wider">
                    <button onClick={() => handleSort('haikuScore')} className="flex items-center gap-1 ml-auto hover:text-secondary">
                      Haiku {sortIcon('haikuScore')}
                    </button>
                  </th>
                )}
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted uppercase tracking-wider">Seniority</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted uppercase tracking-wider">Skill</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((candidate) => {
                const isEliminated = !!candidate.eliminationReason;
                return (
                  <tr
                    key={candidate.upstreamId}
                    className={`border-b border-white/5 transition-colors ${
                      isEliminated ? 'opacity-60' : 'hover:bg-white/5'
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isEliminated ? 'bg-red-400' : 'bg-emerald-500'}`} />
                        <span className={`font-medium truncate max-w-[140px] ${isEliminated ? 'text-muted line-through' : 'text-primary'}`}>
                          {candidate.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded-md font-mono ${
                        candidate.sourceType === 'employees'
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                      }`}>
                        {candidate.sourceType === 'employees' ? 'EMP' : 'CAND'}
                      </span>
                      {candidate.isBench && (
                        <span className="ml-1 text-xs px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          B
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isEliminated ? 'bg-red-400/50' : 'bg-accent-500'}`}
                            style={{ width: `${Math.round(candidate.cosineSimilarity * 100)}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs text-secondary w-10 text-right">
                          {(candidate.cosineSimilarity * 100).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    {stage === 'afterHaikuTriage' && (
                      <td className="px-3 py-2.5 text-right">
                        {candidate.haikuScore != null && (
                          <span className={`font-mono text-xs ${
                            candidate.haikuScore >= 60 ? 'text-emerald-500' :
                            candidate.haikuScore >= 40 ? 'text-amber-500' : 'text-red-400'
                          }`}>
                            {candidate.haikuScore}
                          </span>
                        )}
                      </td>
                    )}
                    <td className="px-3 py-2.5 text-xs text-secondary truncate max-w-[80px]">
                      {candidate.seniority || '—'}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-secondary truncate max-w-[100px]">
                      {candidate.mainSkill || '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      {isEliminated ? (
                        <span className="text-xs text-red-400 truncate max-w-[140px] block">
                          {candidate.eliminationReason}
                        </span>
                      ) : (
                        <span className="text-xs text-emerald-500">Passed</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
