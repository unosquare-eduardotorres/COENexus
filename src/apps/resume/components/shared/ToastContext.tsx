import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Toast, { ToastItem, ToastSeverity } from './Toast';

interface ToastContextValue {
  showToast: (message: string, severity: ToastSeverity, duration?: number) => void;
}

interface ToastProviderProps {
  children: ReactNode;
}

interface ToastQueueItem extends ToastItem {
  duration: number;
}

const DEFAULT_DURATION = 4000;
const EXIT_DURATION = 250;

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastQueueItem[]>([]);
  const timersRef = useRef<Record<number, ReturnType<typeof window.setTimeout>>>({});

  const clearTimer = useCallback((id: number) => {
    const timer = timersRef.current[id];
    if (timer) {
      window.clearTimeout(timer);
      delete timersRef.current[id];
    }
  }, []);

  const removeToast = useCallback(
    (id: number) => {
      clearTimer(id);
      setToasts((previous) => previous.filter((toast) => toast.id !== id));
    },
    [clearTimer],
  );

  const dismissToast = useCallback(
    (id: number) => {
      clearTimer(id);
      setToasts((previous) =>
        previous.map((toast) => (toast.id === id ? { ...toast, isVisible: false } : toast)),
      );

      timersRef.current[id] = window.setTimeout(() => {
        removeToast(id);
      }, EXIT_DURATION);
    },
    [clearTimer, removeToast],
  );

  const showToast = useCallback(
    (message: string, severity: ToastSeverity, duration = DEFAULT_DURATION) => {
      const id = Date.now() + Math.floor(Math.random() * 10000);
      setToasts((previous) => [{ id, message, severity, duration, isVisible: true }, ...previous]);

      if (duration > 0) {
        timersRef.current[id] = window.setTimeout(() => {
          dismissToast(id);
        }, duration);
      }
    },
    [dismissToast],
  );

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach((timer) => window.clearTimeout(timer));
      timersRef.current = {};
    };
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
    }),
    [showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-3">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            id={toast.id}
            message={toast.message}
            severity={toast.severity}
            isVisible={toast.isVisible}
            onDismiss={dismissToast}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside ToastProvider');
  }
  return context;
}
