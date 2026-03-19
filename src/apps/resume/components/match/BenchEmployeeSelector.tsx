import { useState, useEffect, useMemo } from 'react';
import { BenchEmployee } from '../../types';
import { benchBurnService } from '../../services/benchBurnService';

interface BenchEmployeeSelectorProps {
  onNext: (employees: BenchEmployee[]) => void;
  initialSelected?: BenchEmployee[];
}

export default function BenchEmployeeSelector({ onNext, initialSelected = [] }: BenchEmployeeSelectorProps) {
  const [employees, setEmployees] = useState<BenchEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Map<number, BenchEmployee>>(
    () => new Map(initialSelected.map(e => [e.upstreamId, e]))
  );

  useEffect(() => {
    benchBurnService.getBenchEmployees()
      .then(data => { setEmployees(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return employees;
    const q = search.toLowerCase();
    return employees.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      e.seniority.toLowerCase().includes(q) ||
      e.mainSkill.toLowerCase().includes(q) ||
      e.country.toLowerCase().includes(q) ||
      (e.lastAccount ?? '').toLowerCase().includes(q) ||
      e.upstreamId.toString().includes(q)
    );
  }, [employees, search]);

  const toggleSelect = (emp: BenchEmployee) => {
    if (!emp.isVectorized) return;
    setSelected(prev => {
      const next = new Map(prev);
      if (next.has(emp.upstreamId)) {
        next.delete(emp.upstreamId);
      } else {
        next.set(emp.upstreamId, emp);
      }
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelected(prev => {
      const next = new Map(prev);
      filtered.filter(e => e.isVectorized).forEach(e => next.set(e.upstreamId, e));
      return next;
    });
  };

  const deselectAll = () => setSelected(new Map());

  const selectedCount = selected.size;

  if (loading) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-muted">Loading bench employees...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="text-sm text-red-500">Failed to load bench employees: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <h2 className="text-lg font-semibold text-primary">Select Bench Employees</h2>
        <p className="text-sm text-muted mt-1">Choose employees currently on bench to match against positions</p>
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
              placeholder="Search by name, skill, seniority, country..."
            />
          </div>
          <button
            onClick={selectAllFiltered}
            className="px-3 py-2 text-xs font-medium text-accent-500 hover:bg-accent-500/10 rounded-lg transition-colors whitespace-nowrap"
          >
            Select All ({filtered.filter(e => e.isVectorized).length})
          </button>
          {selectedCount > 0 && (
            <button
              onClick={deselectAll}
              className="px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-500/10 rounded-lg transition-colors whitespace-nowrap"
            >
              Clear
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200/30 dark:border-dark-border/30">
                <th className="text-left py-2 px-2 text-xs font-medium text-muted w-8" />
                <th className="text-left py-2 px-2 text-xs font-medium text-muted">ID</th>
                <th className="text-left py-2 px-2 text-xs font-medium text-muted">Name</th>
                <th className="text-left py-2 px-2 text-xs font-medium text-muted">Email</th>
                <th className="text-left py-2 px-2 text-xs font-medium text-muted">Seniority</th>
                <th className="text-left py-2 px-2 text-xs font-medium text-muted">Main Skill</th>
                <th className="text-left py-2 px-2 text-xs font-medium text-muted">Country</th>
                <th className="text-right py-2 px-2 text-xs font-medium text-muted">Salary</th>
                <th className="text-left py-2 px-2 text-xs font-medium text-muted">Last Account</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(emp => {
                const isSelected = selected.has(emp.upstreamId);
                const disabled = !emp.isVectorized;

                return (
                  <tr
                    key={emp.upstreamId}
                    onClick={() => toggleSelect(emp)}
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
                          : disabled
                          ? 'border-gray-300 dark:border-gray-600'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-2 font-mono text-xs text-muted">{emp.upstreamId}</td>
                    <td className="py-2 px-2 font-medium text-primary">
                      {emp.name}
                      {disabled && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          Not vectorized
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-muted">{emp.email}</td>
                    <td className="py-2 px-2 text-secondary">{emp.seniority}</td>
                    <td className="py-2 px-2">
                      <span className="px-2 py-0.5 text-xs rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                        {emp.mainSkill}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-secondary">{emp.country}</td>
                    <td className="py-2 px-2 text-right font-mono text-xs text-secondary">
                      {emp.grossMonthlySalary != null
                        ? `${emp.salaryCurrency ?? ''} ${emp.grossMonthlySalary.toLocaleString()}`
                        : '—'}
                    </td>
                    <td className="py-2 px-2 text-muted text-xs">{emp.lastAccount ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted py-6">
            {search ? 'No employees match your search.' : 'No bench employees found.'}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between glass-card p-4">
        <div className="text-sm text-secondary">
          <span className="font-mono font-semibold text-primary">{selectedCount}</span> employee{selectedCount !== 1 ? 's' : ''} selected
          <span className="text-muted ml-2">of {employees.length} on bench</span>
        </div>
        <button
          onClick={() => onNext(Array.from(selected.values()))}
          disabled={selectedCount === 0}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue with {selectedCount} employee{selectedCount !== 1 ? 's' : ''}
        </button>
      </div>
    </div>
  );
}
