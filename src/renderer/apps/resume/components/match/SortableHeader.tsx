import { useState } from 'react';

interface SortableHeaderProps<K extends string> {
  label: string;
  sortKey: K;
  currentSortKey: K | null;
  currentDirection: 'asc' | 'desc';
  onSort: (key: K) => void;
  align?: 'left' | 'right';
}

export default function SortableHeader<K extends string>({
  label,
  sortKey,
  currentSortKey,
  currentDirection,
  onSort,
  align = 'left',
}: SortableHeaderProps<K>) {
  const isActive = currentSortKey === sortKey;

  return (
    <th
      className={`${align === 'right' ? 'text-right' : 'text-left'} py-2 px-2 text-xs font-medium text-muted select-none cursor-pointer hover:text-secondary transition-colors group`}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span className={`inline-flex flex-col leading-none ${isActive ? 'text-accent-500' : 'text-gray-400/40 dark:text-gray-600/40 group-hover:text-gray-400 dark:group-hover:text-gray-500'}`}>
          <svg
            className={`w-2.5 h-2.5 -mb-0.5 ${isActive && currentDirection === 'asc' ? 'text-accent-500' : ''}`}
            viewBox="0 0 10 6" fill="currentColor"
          >
            <path d="M5 0L10 6H0z" />
          </svg>
          <svg
            className={`w-2.5 h-2.5 -mt-0.5 ${isActive && currentDirection === 'desc' ? 'text-accent-500' : ''}`}
            viewBox="0 0 10 6" fill="currentColor"
          >
            <path d="M5 6L0 0h10z" />
          </svg>
        </span>
      </span>
    </th>
  );
}

export function useSort<K extends string>(defaultKey: K | null = null, defaultDir: 'asc' | 'desc' = 'asc') {
  const [sortKey, setSortKey] = useState<K | null>(defaultKey);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultDir);

  const handleSort = (key: K) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return { sortKey, sortDir, handleSort };
}

export function sortData<T>(data: T[], sortKey: string | null, sortDir: 'asc' | 'desc', accessor: (item: T, key: string) => string | number | null): T[] {
  if (!sortKey) return data;
  return [...data].sort((a, b) => {
    const aVal = accessor(a, sortKey);
    const bVal = accessor(b, sortKey);

    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;

    let cmp: number;
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      cmp = aVal - bVal;
    } else {
      cmp = String(aVal).localeCompare(String(bVal), undefined, { sensitivity: 'base', numeric: true });
    }

    return sortDir === 'desc' ? -cmp : cmp;
  });
}
