import { useState, useMemo, useEffect, useRef } from 'react';
import { useNexusStatus } from '../../contexts/NexusStatusContext';
import type { TokenSlotStatus } from '../../contexts/NexusStatusContext';
import type { TokenSource } from '../../../shared/ipc-types';
import {
  validateJwtStructure,
  decodeTokenPayload,
  isTokenExpired,
  formatCountdown,
} from '../../shared/utils/tokenUtils';

type LocalValidation = 'idle' | 'invalid-structure' | 'expired' | 'valid';

function getLocalValidation(token: string): LocalValidation {
  const trimmed = token.trim();
  if (!trimmed) return 'idle';
  if (!validateJwtStructure(trimmed)) return 'invalid-structure';
  const payload = decodeTokenPayload(trimmed);
  if (!payload) return 'invalid-structure';
  if (payload.exp && isTokenExpired(trimmed)) return 'expired';
  return 'valid';
}

// ── Reusable per-slot section ────────────────────────────────────────────────

interface TokenSectionProps {
  title: string;
  description: string;
  source: TokenSource;
  slot: TokenSlotStatus;
  onSetToken: (token: string) => void;
  onValidate: () => void;
  onDisconnect: () => void;
  highlight?: boolean;
  tokenSiteName: string;
  tokenHeaderName: string;
}

function TokenSection({
  title,
  description,
  source,
  slot,
  onSetToken,
  onValidate,
  onDisconnect,
  highlight,
  tokenSiteName,
  tokenHeaderName,
}: TokenSectionProps) {
  const localValidation = useMemo(() => getLocalValidation(slot.token), [slot.token]);
  const canSubmit = localValidation === 'valid' && !slot.isValidating && !slot.isValid;
  const countdownMinutes = slot.remainingMs / 60_000;
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlight && sectionRef.current) {
      sectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [highlight]);

  return (
    <div
      ref={sectionRef}
      className={`glass-panel-subtle rounded-xl p-4 space-y-3 transition-all duration-500 ${
        highlight ? 'ring-2 ring-accent-500/50 animate-pulse' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-primary">{title}</h4>
          <p className="text-xs text-muted mt-0.5">{description}</p>
        </div>
        {slot.isValid && (
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className={`text-xs font-mono font-medium ${
              countdownMinutes > 30 ? 'text-emerald-500' : countdownMinutes > 10 ? 'text-amber-500' : 'text-red-500'
            }`}>
              {formatCountdown(slot.remainingMs)}
            </span>
          </div>
        )}
      </div>

      {slot.showExpirationWarning && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">
          <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <p className="text-xs text-amber-600 dark:text-amber-400">Token expired. Please provide a new one.</p>
        </div>
      )}

      {slot.isValid ? (
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Connected</span>
          <button
            onClick={onDisconnect}
            className="flex items-center gap-1.5 py-1.5 px-3 text-xs font-medium text-red-500 bg-red-500/5 border border-red-500/20 rounded-lg hover:bg-red-500/10 transition-colors"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <>
          <textarea
            value={slot.token}
            onChange={(e) => onSetToken(e.target.value.trim())}
            placeholder={`Paste your ${tokenHeaderName} token here…`}
            disabled={slot.isValidating}
            rows={3}
            className="w-full px-3 py-2 bg-white/50 dark:bg-dark-hover/50 border border-gray-200 dark:border-dark-border rounded-xl text-xs text-primary placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-400/60 dark:focus:border-accent-500/40 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed resize-none font-mono"
          />

          {localValidation === 'invalid-structure' && (
            <p className="text-xs text-amber-600 dark:text-amber-400">Invalid token format. A JWT should have three dot-separated parts.</p>
          )}
          {localValidation === 'expired' && (
            <p className="text-xs text-red-600 dark:text-red-400">This token has expired. Extract a new one from {tokenSiteName}.</p>
          )}
          {slot.error && (
            <p className="text-xs text-red-600 dark:text-red-400">{slot.error}</p>
          )}

          <button
            onClick={onValidate}
            disabled={!canSubmit}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-accent-500 text-white rounded-xl hover:bg-accent-600 transition-colors duration-200 font-medium text-xs disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {slot.isValidating ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Validating…
              </>
            ) : (
              'Validate & Connect'
            )}
          </button>
        </>
      )}
    </div>
  );
}

// ── Main Modal ───────────────────────────────────────────────────────────────

export default function ApiTokenModal() {
  const {
    apiTokens,
    setApiToken,
    validateApiToken,
    disconnectApiToken,
    pendingTokenSource,
    clearPendingTokenSource,
    modals,
    closeModal,
  } = useNexusStatus();

  const [showInstructions, setShowInstructions] = useState(false);

  if (!modals.apiTokens) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => closeModal('apiTokens')} />

      <div className="glass-card relative z-10 w-full max-w-md mx-4 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-primary">API Connections</h3>
          <button
            onClick={() => closeModal('apiTokens')}
            className="p-1 text-muted hover:text-secondary transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* UnoCore API Section */}
        <TokenSection
          title="UnoCore API"
          description="Employees, Candidates, Open Positions, PRR"
          source="unocore"
          slot={apiTokens.unocore}
          onSetToken={(t) => setApiToken('unocore', t)}
          onValidate={() => validateApiToken('unocore')}
          onDisconnect={() => disconnectApiToken('unocore')}
          highlight={pendingTokenSource === 'unocore'}
          tokenSiteName="operations.unosquare.com"
          tokenHeaderName="x-sharepoint-token"
        />

        {/* Exec API Section */}
        <TokenSection
          title="Exec API"
          description="Executive Reports (Placement Margin)"
          source="exec"
          slot={apiTokens.exec}
          onSetToken={(t) => setApiToken('exec', t)}
          onValidate={() => validateApiToken('exec')}
          onDisconnect={() => disconnectApiToken('exec')}
          highlight={pendingTokenSource === 'exec'}
          tokenSiteName="reports.unosquare.com"
          tokenHeaderName="Authorization Bearer"
        />

        {/* Instructions */}
        <div>
          <button
            type="button"
            onClick={() => setShowInstructions(prev => !prev)}
            className="text-xs text-accent-500 hover:text-accent-600 font-medium transition-colors"
          >
            {showInstructions ? 'Hide instructions ▴' : 'How to extract your tokens ▾'}
          </button>

          {showInstructions && (
            <div className="glass-panel-subtle rounded-xl p-4 mt-2 space-y-3">
              <div>
                <h5 className="text-xs font-semibold text-primary uppercase tracking-wider mb-1.5">UnoCore API</h5>
                <ol className="space-y-1 text-xs text-secondary">
                  <li className="flex items-start gap-2"><span className="text-accent-500 font-bold">1.</span> Open operations.unosquare.com → DevTools (F12)</li>
                  <li className="flex items-start gap-2"><span className="text-accent-500 font-bold">2.</span> Go to Network tab → find a request to unocoreapi</li>
                  <li className="flex items-start gap-2"><span className="text-accent-500 font-bold">3.</span> Copy the <code className="px-1 py-0.5 bg-dark-hover/50 rounded text-[10px]">x-sharepoint-token</code> header value</li>
                </ol>
              </div>
              <div className="border-t border-white/5 pt-3">
                <h5 className="text-xs font-semibold text-primary uppercase tracking-wider mb-1.5">Exec API</h5>
                <ol className="space-y-1 text-xs text-secondary">
                  <li className="flex items-start gap-2"><span className="text-accent-500 font-bold">1.</span> Open reports.unosquare.com → DevTools (F12)</li>
                  <li className="flex items-start gap-2"><span className="text-accent-500 font-bold">2.</span> Go to Network tab → find a request to execapi</li>
                  <li className="flex items-start gap-2"><span className="text-accent-500 font-bold">3.</span> Copy the <code className="px-1 py-0.5 bg-dark-hover/50 rounded text-[10px]">Authorization: Bearer</code> header value (without "Bearer ")</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
