import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { PathRole } from '../types';

interface PathRoleContextValue {
  role: PathRole;
  setRole: (role: PathRole) => void;
}

const PATH_ROLE_STORAGE_KEY = 'path-role';
const DEFAULT_ROLE: PathRole = 'developer';

const PathRoleContext = createContext<PathRoleContextValue | undefined>(undefined);

function isPathRole(value: string): value is PathRole {
  return value === 'developer' || value === 'mentor' || value === 'evaluator' || value === 'practice-lead' || value === 'coe-lead';
}

export function PathRoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<PathRole>(DEFAULT_ROLE);

  useEffect(() => {
    const stored = window.localStorage.getItem(PATH_ROLE_STORAGE_KEY);
    if (stored && isPathRole(stored)) {
      setRoleState(stored);
    }
  }, []);

  const setRole = (nextRole: PathRole) => {
    setRoleState(nextRole);
    window.localStorage.setItem(PATH_ROLE_STORAGE_KEY, nextRole);
  };

  const value = useMemo(() => ({ role, setRole }), [role]);

  return <PathRoleContext.Provider value={value}>{children}</PathRoleContext.Provider>;
}

export function usePathRole() {
  const context = useContext(PathRoleContext);
  if (!context) {
    throw new Error('usePathRole must be used within a PathRoleProvider');
  }
  return context;
}
