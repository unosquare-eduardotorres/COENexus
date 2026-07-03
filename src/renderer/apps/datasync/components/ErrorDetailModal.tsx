import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ErrorDetailModalProps {
  name: string;
  error: string;
  onClose: () => void;
}

export default function ErrorDetailModal({ name, error, onClose }: ErrorDetailModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6" onClick={onClose}>
      <div
        className="glass-card w-full max-w-lg p-6 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-primary">{name}</h3>
            <p className="text-xs text-muted mt-0.5">Error Detail</p>
          </div>
        </div>

        <div className="mt-4">
          <pre className="whitespace-pre-wrap max-h-64 overflow-y-auto text-sm text-secondary bg-gray-50 dark:bg-dark-hover/50 border border-gray-200 dark:border-dark-border rounded-xl p-4 font-mono leading-relaxed">
            {error}
          </pre>
        </div>

        <div className="flex items-center justify-end mt-6">
          <button
            ref={closeRef}
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-secondary bg-white/50 dark:bg-dark-hover/50 border border-gray-200 dark:border-dark-border rounded-xl hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
