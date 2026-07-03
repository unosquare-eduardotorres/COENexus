import { useState, useMemo } from 'react';

export interface Column<T> {
  key: string;
  label: string;
  render: (item: T) => React.ReactNode;
  sortKey?: (item: T) => string | number;
}

interface CatalogTableProps<T extends { id: number; name: string; is_active: number }> {
  items: T[];
  columns: Column<T>[];
  searchValue: string;
  onSearchChange: (v: string) => void;
  onEdit: (item: T) => void;
  onToggleActive: (item: T) => void;
  onAdd: () => void;
  title: string;
  addLabel: string;
}

export default function CatalogTable<T extends { id: number; name: string; is_active: number }>({
  items,
  columns,
  searchValue,
  onSearchChange,
  onEdit,
  onToggleActive,
  onAdd,
  title,
  addLabel,
}: CatalogTableProps<T>) {
  const [sortCol, setSortCol] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const filtered = useMemo(() => {
    const q = searchValue.toLowerCase().trim();
    if (!q) return items;
    return items.filter(item => item.name.toLowerCase().includes(q));
  }, [items, searchValue]);

  const sorted = useMemo(() => {
    const col = columns.find(c => c.key === sortCol);
    if (!col?.sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const va = col.sortKey!(a);
      const vb = col.sortKey!(b);
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortCol, sortDir, columns]);

  const handleSort = (key: string) => {
    if (sortCol === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(key);
      setSortDir('asc');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">{title}</h2>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-600 hover:bg-purple-500 text-white transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {addLabel}
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Search by name..."
            value={searchValue}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => col.sortKey && handleSort(col.key)}
                  className={`text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 ${col.sortKey ? 'cursor-pointer hover:text-slate-200 select-none' : ''}`}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {col.sortKey && sortCol === col.key && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={sortDir === 'desc' ? 'rotate-180' : ''}>
                        <path d="M12 5v14M5 12l7-7 7 7" />
                      </svg>
                    )}
                  </span>
                </th>
              ))}
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 2} className="px-4 py-12 text-center text-slate-500">
                  {searchValue ? 'No items match your search.' : 'No items yet. Click the button above to add one.'}
                </td>
              </tr>
            ) : (
              sorted.map(item => (
                <tr key={item.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  {columns.map(col => (
                    <td key={col.key} className="px-4 py-3 text-slate-200">
                      {col.render(item)}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                      item.is_active
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                    }`}>
                      {item.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onEdit(item)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                        title="Edit"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                          <path d="m15 5 4 4" />
                        </svg>
                      </button>
                      <button
                        onClick={() => onToggleActive(item)}
                        className={`relative w-8 h-[18px] rounded-full transition-colors ${
                          item.is_active ? 'bg-emerald-500' : 'bg-slate-600'
                        }`}
                        title={item.is_active ? 'Deactivate' : 'Activate'}
                      >
                        <span className={`absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-white transition-transform ${
                          item.is_active ? 'translate-x-[14px]' : ''
                        }`} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-2 text-xs text-slate-500">
        {filtered.length} of {items.length} item{items.length !== 1 ? 's' : ''}
        {searchValue && ` matching "${searchValue}"`}
      </div>
    </div>
  );
}
