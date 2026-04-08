import { useState, useEffect, useMemo } from 'react';
import { BenchEmployee } from '../../types';
import { benchBurnService } from '../../services/benchBurnService';
import SortableHeader, { useSort, sortData } from './SortableHeader';

type EmpSortKey = 'upstreamId' | 'name' | 'email' | 'seniority' | 'mainSkill' | 'country' | 'salary' | 'lastAccount';

interface DeliveryEmployeeSelectorProps {
  onNext: (employee: BenchEmployee) => void;
  initialSelected?: BenchEmployee | null;
}

function empAccessor(emp: BenchEmployee, key: string): string | number | null {
  switch (key) {
    case 'upstreamId': return emp.upstreamId;
    case 'name': return emp.name;
    case 'email': return emp.email;
    case 'seniority': return emp.seniority;
    case 'mainSkill': return emp.mainSkill;
    case 'country': return emp.country;
    case 'salary': return emp.grossMonthlySalary;
    case 'lastAccount': return emp.lastAccount;
    default: return null;
  }
}

export default function DeliveryEmployeeSelector({ onNext, initialSelected = null }: DeliveryEmployeeSelectorProps) {
  const [employees, setEmployees] = useState<BenchEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<BenchEmployee | null>(initialSelected);
  const { sortKey, sortDir, handleSort } = useSort<EmpSortKey>('name');

  useEffect(() => {
    benchBurnService.getAllEmployees()
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

  const sorted = useMemo(
    () => sortData(filtered, sortKey, sortDir, empAccessor),
    [filtered, sortKey, sortDir]
  );

  const handleSelect = (emp: BenchEmployee) => {
    if (!emp.isVectorized) return;
    setSelected(prev => (prev?.upstreamId === emp.upstreamId ? null : emp));
  };

  if (loading) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-muted">Loading employees...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="text-sm text-red-500">Failed to load employees: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <h2 className="text-lg font-semibold text-primary">Select Delivery Professional</h2>
        <p className="text-sm text-muted mt-1">Choose an employee to analyze against open positions</p>
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
          {selected && (
            <button
              onClick={() => setSelected(null)}
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
                <SortableHeader<EmpSortKey> label="ID" sortKey="upstreamId" currentSortKey={sortKey} currentDirection={sortDir} onSort={handleSort} />
                <SortableHeader<EmpSortKey> label="Name" sortKey="name" currentSortKey={sortKey} currentDirection={sortDir} onSort={handleSort} />
                <SortableHeader<EmpSortKey> label="Email" sortKey="email" currentSortKey={sortKey} currentDirection={sortDir} onSort={handleSort} />
                <SortableHeader<EmpSortKey> label="Seniority" sortKey="seniority" currentSortKey={sortKey} currentDirection={sortDir} onSort={handleSort} />
                <SortableHeader<EmpSortKey> label="Main Skill" sortKey="mainSkill" currentSortKey={sortKey} currentDirection={sortDir} onSort={handleSort} />
                <SortableHeader<EmpSortKey> label="Country" sortKey="country" currentSortKey={sortKey} currentDirection={sortDir} onSort={handleSort} />
                <SortableHeader<EmpSortKey> label="Salary" sortKey="salary" currentSortKey={sortKey} currentDirection={sortDir} onSort={handleSort} align="right" />
                <SortableHeader<EmpSortKey> label="Last Account" sortKey="lastAccount" currentSortKey={sortKey} currentDirection={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {sorted.map(emp => {
                const isSelected = selected?.upstreamId === emp.upstreamId;
                const disabled = !emp.isVectorized;

                return (
                  <tr
                    key={emp.upstreamId}
                    onClick={() => handleSelect(emp)}
                    className={`border-b border-gray-100/20 dark:border-dark-border/20 transition-colors ${
                      disabled
                        ? 'opacity-40 cursor-not-allowed'
                        : isSelected
                        ? 'bg-rose-500/5 cursor-pointer'
                        : 'hover:bg-white/5 cursor-pointer'
                    }`}
                    title={disabled ? 'Not vectorized — run processing first' : undefined}
                  >
                    <td className="py-2 px-2">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        isSelected
                          ? 'bg-rose-500 border-rose-500'
                          : disabled
                          ? 'border-gray-300 dark:border-gray-600'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {isSelected && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-2 font-mono text-xs text-muted">{emp.upstreamId}</td>
                    <td className="py-2 px-2 font-medium text-primary">
                      {emp.name}
                      {disabled && (
                        <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          Not vectorized
                        </span>
                      )}
                      {!disabled && emp.isBench && (
                        <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400">
                          Bench
                        </span>
                      )}
                      {!disabled && emp.isBench === false && (
                        <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          Active
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

        {sorted.length === 0 && (
          <p className="text-center text-sm text-muted py-6">
            {search ? 'No employees match your search.' : 'No employees found.'}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between glass-card p-4">
        <div className="text-sm text-secondary">
          {selected ? (
            <span>
              Selected: <span className="font-semibold text-primary">{selected.name}</span>
              <span className="text-muted ml-2">({selected.seniority} · {selected.mainSkill})</span>
            </span>
          ) : (
            <span className="text-muted">No employee selected</span>
          )}
        </div>
        <button
          onClick={() => selected && onNext(selected)}
          disabled={!selected}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue with {selected?.name ?? 'Employee'}
        </button>
      </div>
    </div>
  );
}
