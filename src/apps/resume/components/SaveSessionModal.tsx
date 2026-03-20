import { useState, useEffect, useRef } from 'react';

interface SaveSessionModalProps {
  defaultName: string;
  isSaving: boolean;
  onSave: (name: string) => void;
  onCancel: () => void;
}

export default function SaveSessionModal({
  defaultName,
  isSaving,
  onSave,
  onCancel,
}: SaveSessionModalProps) {
  const [sessionName, setSessionName] = useState(defaultName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, isSaving]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sessionName.trim() && !isSaving) {
      onSave(sessionName.trim());
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={() => !isSaving && onCancel()}
    >
      <div
        className="glass-card w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent-100 dark:bg-accent-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-accent-600 dark:text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-primary">Save Session</h3>
              <p className="text-sm text-secondary mt-1.5 leading-relaxed">
                Name this session before enhancing. The enhanced resume will be saved automatically.
              </p>
            </div>
          </div>

          <div className="mt-5">
            <label htmlFor="session-name" className="block text-sm font-medium text-secondary mb-1.5">
              Session Name
            </label>
            <input
              ref={inputRef}
              id="session-name"
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              disabled={isSaving}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark-border bg-white/50 dark:bg-dark-hover/50 text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent-500/40 focus:border-accent-500 transition-colors disabled:opacity-50"
              placeholder="Enter session name..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-secondary bg-white/50 dark:bg-dark-hover/50 border border-gray-200 dark:border-dark-border rounded-xl hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!sessionName.trim() || isSaving}
              className="px-4 py-2 text-sm font-semibold rounded-xl transition-colors bg-accent-500 hover:bg-accent-600 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving && (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              Save & Enhance
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
