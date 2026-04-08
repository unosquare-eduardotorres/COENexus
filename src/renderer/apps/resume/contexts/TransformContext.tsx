import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useTransformWizard } from '../hooks/useTransformWizard';

type TransformContextValue = ReturnType<typeof useTransformWizard>;

const TransformContext = createContext<TransformContextValue | null>(null);

export function TransformProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: TransformContextValue;
}) {
  return (
    <TransformContext.Provider value={value}>
      {children}
    </TransformContext.Provider>
  );
}

export function useTransformContext() {
  const ctx = useContext(TransformContext);
  if (!ctx) {
    throw new Error('useTransformContext must be used within TransformProvider');
  }
  return ctx;
}
