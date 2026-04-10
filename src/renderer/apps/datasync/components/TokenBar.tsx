import { useState, useMemo } from 'react';
import { validateJwtStructure, isTokenExpired } from '../../../shared/utils/tokenUtils';
import TokenTimer from './TokenTimer';

interface TokenBarProps {
  token: string;
  onTokenChange: (token: string) => void;
  isTokenValid: boolean;
  isValidating: boolean;
  tokenError?: string;
  onValidate: () => void;
  onDisconnect: () => void;
  onExpired: () => void;
}

export default function TokenBar({
  token,
  onTokenChange,
  isTokenValid,
  isValidating,
  tokenError,
  onValidate,
  onDisconnect,
  onExpired,
}: TokenBarProps) {
  const [showInput, setShowInput] = useState(false);

  const canSubmit = useMemo(() => {
    const trimmed = token.trim();
    if (!trimmed) return false;
    if (!validateJwtStructure(trimmed)) return false;
    if (isTokenExpired(trimmed)) return false;
    return !isValidating && !isTokenValid;
  }, [token, isValidating, isTokenValid]);

  if (isTokenValid) {
    return (
      <div className="flex items-center gap-2 titlebar-no-drag">
        <TokenTimer token={token} onExpired={onExpired} />
        <button
          onClick={onDisconnect}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 hover:text-red-600 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 rounded-lg transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
          Disconnect
        </button>
      </div>
    );
  }

  if (!showInput) {
    return (
      <button
        onClick={() => setShowInput(true)}
        className="titlebar-no-drag inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors shadow-sm shadow-amber-500/25"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.9-4.243a4.5 4.5 0 00-1.242-7.244l4.5-4.5a4.5 4.5 0 016.364 6.364l-1.757 1.757" />
        </svg>
        Connect Token
      </button>
    );
  }

  return (
    <div className="titlebar-no-drag flex items-center gap-2">
      <input
        type="password"
        value={token}
        onChange={(e) => onTokenChange(e.target.value.trim())}
        placeholder="Paste token..."
        className="glass-input px-2.5 py-1.5 text-xs font-mono w-48"
        autoFocus
      />
      <button
        onClick={onValidate}
        disabled={!canSubmit}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
      >
        {isValidating ? (
          <>
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Validating
          </>
        ) : (
          'Validate'
        )}
      </button>
      <button
        onClick={() => { setShowInput(false); onTokenChange(''); }}
        className="p-1.5 text-muted hover:text-secondary transition-colors"
        title="Cancel"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      {tokenError && (
        <span className="text-xs text-red-500 max-w-[200px] truncate" title={tokenError}>
          {tokenError}
        </span>
      )}
    </div>
  );
}
