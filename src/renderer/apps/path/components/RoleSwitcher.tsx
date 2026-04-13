import { useEffect, useRef, useState } from 'react';
import type { PathRole } from '../types';
import { usePathRole } from '../contexts/PathRoleContext';
import { trackPathEvent } from '../services/pathAnalytics';

const roleLabels: Record<PathRole, string> = {
  developer: 'Developer',
  mentor: 'Mentor',
  evaluator: 'Evaluator',
  'practice-lead': 'Practice Lead',
  'coe-lead': 'COE Lead',
};

const roles: PathRole[] = ['developer', 'mentor', 'evaluator', 'practice-lead', 'coe-lead'];

export default function RoleSwitcher() {
  const { role, setRole } = usePathRole();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', onPointerDown);
    return () => window.removeEventListener('mousedown', onPointerDown);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="glass-button flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm font-medium text-primary"
      >
        <span>{roleLabels[role]}</span>
        <svg className={`h-4 w-4 text-violet-500 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? (
        <div className="glass-panel absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-xl border border-violet-500/20 p-1">
          {roles.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                trackPathEvent('role_switched', { from: role, to: item });
                setRole(item);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                role === item
                  ? 'bg-violet-500/15 text-violet-600 dark:text-violet-300'
                  : 'text-secondary hover:bg-violet-500/10 hover:text-primary'
              }`}
            >
              <span>{roleLabels[item]}</span>
              {role === item ? <span className="text-xs font-semibold uppercase tracking-wide">Current</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
