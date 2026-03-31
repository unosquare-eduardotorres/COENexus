import { useState, useEffect, useMemo } from 'react';
import { BenchOpenPosition } from '../../types';
import { benchBurnService } from '../../services/benchBurnService';
import SortableHeader, { useSort, sortData } from './SortableHeader';

type PosSortKey = 'upstreamId' | 'account' | 'coe' | 'practice' | 'stakeholder' | 'mainSkill' | 'jobTitle';

interface BenchPositionSelectorProps {
  onNext: (positions: BenchOpenPosition[], customPositions: { name: string; jd: string }[]) => void;
  initialSelected?: BenchOpenPosition[];
  initialCustom?: { name: string; jd: string }[];
  singleSelect?: boolean;
}

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

export default function BenchPositionSelector({
  onNext,
  initialSelected = [],
  initialCustom = [],
  singleSelect = false,
}: BenchPositionSelectorProps) {
  const [positions, setPositions] = useState<BenchOpenPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Map<number, BenchOpenPosition>>(
    () => new Map((singleSelect ? initialSelected.slice(0, 1) : initialSelected).map(p => [p.upstreamId, p]))
  );
  const [customPositions, setCustomPositions] = useState<{ name: string; jd: string }[]>(singleSelect ? [] : initialCustom);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customJd, setCustomJd] = useState('');
  const { sortKey, sortDir, handleSort } = useSort<PosSortKey>('account');

  useEffect(() => {
    benchBurnService.getOpenPositions()
      .then(data => { setPositions(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!singleSelect) return;
    setSelected(prev => {
      if (prev.size <= 1) return prev;
      const first = prev.values().next().value;
      return first ? new Map([[first.upstreamId, first]]) : new Map();
    });
    setCustomPositions([]);
    setShowCustomForm(false);
  }, [singleSelect]);

  const filtered = useMemo(() => {
    if (!search.trim()) return positions;
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

  const toggleSelect = (pos: BenchOpenPosition) => {
    if (!pos.isVectorized) return;
    setSelected(prev => {
      if (singleSelect) {
        if (prev.has(pos.upstreamId)) {
          return new Map();
        }
        return new Map([[pos.upstreamId, pos]]);
      }
      const next = new Map(prev);
      if (next.has(pos.upstreamId)) {
        next.delete(pos.upstreamId);
      } else {
        next.set(pos.upstreamId, pos);
      }
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelected(prev => {
      const next = new Map(prev);
      filtered.filter(p => p.isVectorized).forEach(p => next.set(p.upstreamId, p));
      return next;
    });
  };

  const deselectAll = () => setSelected(new Map());

  const addCustomPosition = () => {
    if (!customName.trim() || !customJd.trim()) return;
    setCustomPositions(prev => [...prev, { name: customName.trim(), jd: customJd.trim() }]);
    setCustomName('');
    setCustomJd('');
    setShowCustomForm(false);
  };

  const removeCustom = (index: number) => {
    setCustomPositions(prev => prev.filter((_, i) => i !== index));
  };

  const totalSelected = selected.size + customPositions.length;

  if (loading) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-muted">Loading open positions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="text-sm text-red-500">Failed to load positions: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <h2 className="text-lg font-semibold text-primary">Select Open Positions</h2>
        <p className="text-sm text-muted mt-1">Choose positions to match bench employees against</p>
      </div>

      <div className="glass-card p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl glass-input text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent-500/30"
              placeholder="Search by account, skill, COE, stakeholder..."
            />
          </div>
          {!singleSelect && (
            <button
              onClick={selectAllFiltered}
              className="px-3 py-2 text-xs font-medium text-accent-500 hover:bg-accent-500/10 rounded-lg transition-colors whitespace-nowrap"
            >
              Select All ({filtered.filter(p => p.isVectorized).length})
            </button>
          )}
          {!singleSelect && selected.size > 0 && (
            <button
              onClick={deselectAll}
              className="px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-500/10 rounded-lg transition-colors whitespace-nowrap"
            >
              Clear
            </button>
          )}
          {!singleSelect && (
            <button
              onClick={() => setShowCustomForm(!showCustomForm)}
              className="px-3 py-2 text-xs font-medium text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Custom
            </button>
          )}
        </div>

        {!singleSelect && showCustomForm && (
          <div className="mb-4 p-4 rounded-xl border-2 border-dashed border-emerald-500/30 bg-emerald-500/5">
            <h4 className="text-sm font-medium text-primary mb-3">Add Custom Position</h4>
            <input
              type="text"
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg glass-input text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/30 mb-2"
              placeholder="Position name (e.g., Senior React Developer)"
            />
            <textarea
              value={customJd}
              onChange={e => setCustomJd(e.target.value)}
              className="w-full px-3 py-2 rounded-lg glass-input text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/30 min-h-[80px] resize-y"
              placeholder="Paste or type the job description..."
              rows={4}
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => { setShowCustomForm(false); setCustomName(''); setCustomJd(''); }}
                className="px-3 py-1.5 text-xs text-muted hover:text-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addCustomPosition}
                disabled={!customName.trim() || !customJd.trim()}
                className="px-4 py-1.5 text-xs font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors disabled:opacity-40"
              >
                Add Position
              </button>
            </div>
          </div>
        )}

        {!singleSelect && customPositions.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {customPositions.map((cp, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
              >
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{cp.name}</span>
                <button
                  onClick={() => removeCustom(i)}
                  className="w-4 h-4 rounded-full bg-emerald-500/20 hover:bg-red-500/20 flex items-center justify-center text-emerald-600 hover:text-red-500 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200/30 dark:border-dark-border/30">
                <th className="text-left py-2 px-2 text-xs font-medium text-muted w-8" />
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
                const isSelected = selected.has(pos.upstreamId);
                const disabled = !pos.isVectorized;

                return (
                  <tr
                    key={pos.upstreamId}
                    onClick={() => toggleSelect(pos)}
                    className={`border-b border-gray-100/20 dark:border-dark-border/20 transition-colors ${
                      disabled
                        ? 'opacity-40 cursor-not-allowed'
                        : isSelected
                        ? 'bg-accent-500/5 cursor-pointer'
                        : 'hover:bg-white/5 cursor-pointer'
                    }`}
                    title={disabled ? 'Not vectorized — run processing first' : undefined}
                  >
                    <td className="py-2 px-2">
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                        isSelected
                          ? 'bg-accent-500 border-accent-500'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-2 font-mono text-xs text-muted">{pos.upstreamId}</td>
                    <td className="py-2 px-2 font-medium text-primary">
                      {pos.account}
                      {disabled && (
                        <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          Not vectorized
                        </span>
                      )}
                    </td>
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
          <p className="text-center text-sm text-muted py-6">
            {search ? 'No positions match your search.' : 'No open positions found.'}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between glass-card p-4">
        <div className="text-sm text-secondary">
          <span className="font-mono font-semibold text-primary">{selected.size}</span> synced
          {customPositions.length > 0 && (
            <> + <span className="font-mono font-semibold text-emerald-500">{customPositions.length}</span> custom</>
          )}
          {' '}position{totalSelected !== 1 ? 's' : ''} selected
        </div>
        <button
          onClick={() => onNext(Array.from(selected.values()), customPositions)}
          disabled={totalSelected === 0}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue with {totalSelected} position{totalSelected !== 1 ? 's' : ''}
        </button>
      </div>
    </div>
  );
}
