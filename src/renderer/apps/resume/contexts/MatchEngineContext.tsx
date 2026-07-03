import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useMatchEngine } from '../hooks/useMatchEngine';

type MatchEngineContextValue = ReturnType<typeof useMatchEngine>;

const MatchEngineContext = createContext<MatchEngineContextValue | null>(null);

export function MatchEngineProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: MatchEngineContextValue;
}) {
  return (
    <MatchEngineContext.Provider value={value}>
      {children}
    </MatchEngineContext.Provider>
  );
}

export function useMatchEngineContext() {
  const ctx = useContext(MatchEngineContext);
  if (!ctx) {
    throw new Error('useMatchEngineContext must be used within MatchEngineProvider');
  }
  return ctx;
}
