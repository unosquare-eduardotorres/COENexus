import { useState, useEffect, useRef, useMemo } from 'react';

interface DangerConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const CHALLENGE_WORDS = [
  'confirm', 'delete', 'remove', 'erase', 'clear', 'purge', 'destroy',
  'wipe', 'reset', 'flush', 'drop', 'discard', 'clean', 'empty',
  'eliminate', 'obliterate', 'expunge', 'annihilate', 'terminate', 'demolish',
];

export default function DangerConfirmModal({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: DangerConfirmModalProps) {
  const [typed, setTyped] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const challengeWord = useMemo(
    () => CHALLENGE_WORDS[Math.floor(Math.random() * CHALLENGE_WORDS.length)],
    []
  );

  const isMatch = typed.toLowerCase().trim() === challengeWord.toLowerCase();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6" onClick={onCancel}>
      <div
        className="glass-card w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200 border border-red-200 dark:border-red-500/20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">{title}</h3>
            <p className="text-sm text-secondary mt-1.5 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <label className="block text-sm font-medium text-secondary">
            Type "<span className="font-bold text-red-600 dark:text-red-400 select-all">{challengeWord}</span>" to confirm
          </label>
          <input
            ref={inputRef}
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && isMatch) onConfirm();
            }}
            placeholder={challengeWord}
            className="w-full px-3 py-2 bg-white/50 dark:bg-dark-hover/50 border border-red-200 dark:border-red-500/30 rounded-xl text-sm text-primary placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400/60 dark:focus:border-red-500/40 transition-all duration-200"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-secondary bg-white/50 dark:bg-dark-hover/50 border border-gray-200 dark:border-dark-border rounded-xl hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={!isMatch}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors ${
              isMatch
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-red-600/40 text-white/60 cursor-not-allowed'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
