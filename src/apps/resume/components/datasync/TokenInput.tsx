import { useState, useMemo } from 'react';
import { validateJwtStructure, decodeTokenPayload, isTokenExpired } from '../../utils/tokenUtils';

interface TokenInputProps {
  token: string;
  onTokenChange: (token: string) => void;
  isValid: boolean;
  onValidate: () => void;
  isValidating: boolean;
  error?: string;
  onDisconnect: () => void;
  onContinueWithoutToken?: () => void;
}

type LocalValidation = 'idle' | 'invalid-structure' | 'expired' | 'valid';

const extractionSteps = [
  'Open SharePoint in your browser and sign in.',
  'Press F12 (or right-click → Inspect) to open Developer Tools.',
  'Go to the Network tab and trigger any page load.',
  'Click on a request to your SharePoint site.',
  'In the request headers, find the cookie or authorization header containing the token.',
  'Copy the full token value and paste it below.',
];

export default function TokenInput({
  token,
  onTokenChange,
  isValid,
  onValidate,
  isValidating,
  error,
  onDisconnect,
  onContinueWithoutToken,
}: TokenInputProps) {
  const [showInstructions, setShowInstructions] = useState(false);

  const localValidation = useMemo((): LocalValidation => {
    const trimmed = token.trim();
    if (!trimmed) return 'idle';
    if (!validateJwtStructure(trimmed)) return 'invalid-structure';
    const payload = decodeTokenPayload(trimmed);
    if (!payload) return 'invalid-structure';
    if (payload.exp && isTokenExpired(trimmed)) return 'expired';
    return 'valid';
  }, [token]);

  const canSubmit = localValidation === 'valid' && !isValidating && !isValid;

  return (
    <div className="glass-card p-6 space-y-4">
      <div>
        <h3 className="text-base font-semibold text-primary">SharePoint Connection</h3>
        <p className="text-sm text-muted mt-1">Enter your SharePoint token to connect and sync data.</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-secondary">X-Sharepoint-Token</label>
          <button
            type="button"
            onClick={() => setShowInstructions(prev => !prev)}
            className="text-xs text-accent-500 hover:text-accent-600 font-medium transition-colors"
          >
            {showInstructions ? 'Hide instructions' : 'How to extract your token'}
          </button>
        </div>

        {showInstructions && (
          <div className="glass-panel-subtle rounded-xl p-4 space-y-2">
            <h4 className="text-xs font-semibold text-primary uppercase tracking-wider">How to Extract Your Token</h4>
            <ol className="space-y-1.5">
              {extractionSteps.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-secondary">
                  <span className="flex-shrink-0 w-4 h-4 rounded-full bg-accent-500/10 text-accent-500 flex items-center justify-center text-[10px] font-bold mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}

        <textarea
          value={token}
          onChange={(e) => onTokenChange(e.target.value.trim())}
          placeholder="Paste your SharePoint JWT token here..."
          disabled={isValidating || isValid}
          rows={4}
          className="w-full px-4 py-2.5 bg-white/50 dark:bg-dark-hover/50 border border-gray-200 dark:border-dark-border rounded-xl text-sm text-primary placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-400/60 dark:focus:border-accent-500/40 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed resize-none font-mono"
        />
      </div>

      {localValidation === 'invalid-structure' && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">
          <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-amber-600 dark:text-amber-400">Invalid token format. A JWT token should have three parts separated by dots.</p>
        </div>
      )}

      {localValidation === 'expired' && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl">
          <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-red-600 dark:text-red-400">This token has expired. Please extract a new token from SharePoint.</p>
        </div>
      )}

      {localValidation === 'valid' && !isValid && !error && (
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl">
          <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-emerald-600 dark:text-emerald-400">Token structure looks valid. Click below to verify with the server.</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl">
          <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {isValid && (
        <div className="flex items-center justify-between gap-3 px-3 py-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Connected successfully</p>
          </div>
          <button
            onClick={onDisconnect}
            className="text-xs text-red-500 hover:text-red-600 font-medium transition-colors"
          >
            Disconnect
          </button>
        </div>
      )}

      {!isValid && (
        <div className="space-y-3">
          <button
            onClick={onValidate}
            disabled={!canSubmit}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-accent-500 text-white rounded-xl hover:bg-accent-600 transition-colors duration-200 font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isValidating ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Validating...
              </>
            ) : (
              'Validate & Connect'
            )}
          </button>

          {onContinueWithoutToken && (
            <>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200 dark:bg-dark-border" />
                <span className="text-xs text-muted">or</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-dark-border" />
              </div>

              <button
                type="button"
                onClick={onContinueWithoutToken}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-secondary bg-white/50 dark:bg-dark-hover/50 border border-gray-200 dark:border-dark-border rounded-xl hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors duration-200 font-medium text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                Continue without Token
              </button>
              <p className="text-xs text-muted text-center">
                You can extract text and vectorize already-synced data without a token.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
