import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  type ReactNode,
} from 'react';
import {
  isTokenExpired,
  getTokenExpiration,
} from '../shared/utils/tokenUtils';
import { safeJsonParse } from '../shared/utils/safeJsonParse';
import type { TokenSource } from '../../shared/ipc-types';

interface ClaudeStatus {
  connected: boolean;
  checking: boolean;
  lastChecked: Date | null;
  cliInstalled: boolean;
  cliVersion: string | null;
  authenticated: boolean;
  plan: string | null;
  error: string | null;
}

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface TokenSlotStatus {
  token: string;
  isValid: boolean;
  isValidating: boolean;
  error?: string;
  remainingMs: number;
  showExpirationWarning: boolean;
}

export interface ApiTokensState {
  unocore: TokenSlotStatus;
  exec: TokenSlotStatus;
}

interface ModalState {
  claude: boolean;
  tokens: boolean;
  apiTokens: boolean;
}

type ModalKey = 'claude' | 'tokens' | 'apiTokens';

interface NexusStatusContextValue {
  claude: ClaudeStatus;
  checkClaude: () => Promise<void>;
  tokens: TokenUsage;
  refreshTokenUsage: () => Promise<void>;
  resetTokenUsage: () => Promise<void>;
  apiTokens: ApiTokensState;
  setApiToken: (source: TokenSource, token: string) => void;
  validateApiToken: (source: TokenSource) => Promise<void>;
  disconnectApiToken: (source: TokenSource) => void;
  requireApiToken: (source: TokenSource) => boolean;
  pendingTokenSource: TokenSource | null;
  clearPendingTokenSource: () => void;
  modals: ModalState;
  openModal: (modal: ModalKey) => void;
  closeModal: (modal: ModalKey) => void;
}

const NexusStatusContext = createContext<NexusStatusContextValue | null>(null);

export function useNexusStatus(): NexusStatusContextValue {
  const ctx = useContext(NexusStatusContext);
  if (!ctx) throw new Error('useNexusStatus must be used within NexusStatusProvider');
  return ctx;
}

// ── localStorage migration (old single token → dual slots) ──────────────────
function runTokenMigration() {
  const migrated = localStorage.getItem('datasync-token-migrated');
  if (!migrated) {
    const oldToken = localStorage.getItem('datasync-token');
    const oldValid = localStorage.getItem('datasync-is-token-valid');
    if (oldToken) {
      localStorage.setItem('datasync-token-unocore', oldToken);
      if (oldValid) localStorage.setItem('datasync-is-token-valid-unocore', oldValid);
    }
    localStorage.removeItem('datasync-token');
    localStorage.removeItem('datasync-is-token-valid');
    localStorage.setItem('datasync-token-migrated', '1');
  }
}

// ── Per-slot hook ────────────────────────────────────────────────────────────
interface TokenSlotReturn {
  token: string;
  valid: boolean;
  validating: boolean;
  error: string | undefined;
  remainingMs: number;
  showWarning: boolean;
  setToken: (t: string) => void;
  setValid: (v: boolean) => void;
  setValidating: (v: boolean) => void;
  setError: (e: string | undefined) => void;
  setShowWarning: (v: boolean) => void;
  disconnect: () => void;
}

function useTokenSlot(storageKeyToken: string, storageKeyValid: string): TokenSlotReturn {
  const [token, setTokenRaw] = useState(() =>
    localStorage.getItem(storageKeyToken) ?? ''
  );
  const [valid, setValid] = useState(() => {
    const storedToken = localStorage.getItem(storageKeyToken) ?? '';
    const wasValid = safeJsonParse(localStorage.getItem(storageKeyValid), false);
    if (wasValid && storedToken && !isTokenExpired(storedToken)) return true;
    return false;
  });
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [remainingMs, setRemainingMs] = useState(0);
  const [showWarning, setShowWarning] = useState(false);

  // Persist token to localStorage
  useEffect(() => {
    if (token) {
      localStorage.setItem(storageKeyToken, token);
    } else {
      localStorage.removeItem(storageKeyToken);
    }
  }, [token, storageKeyToken]);

  // Persist valid flag to localStorage
  useEffect(() => {
    localStorage.setItem(storageKeyValid, JSON.stringify(valid));
  }, [valid, storageKeyValid]);

  // Countdown timer — each slot owns its own interval
  const expiredRef = useRef(false);
  useEffect(() => {
    expiredRef.current = false;

    const computeRemaining = () => {
      const expiresAt = getTokenExpiration(token);
      if (!expiresAt) return 0;
      return Math.max(0, expiresAt.getTime() - Date.now());
    };

    setRemainingMs(computeRemaining());

    const interval = setInterval(() => {
      const ms = computeRemaining();
      setRemainingMs(ms);

      if (ms <= 0 && valid && !expiredRef.current) {
        expiredRef.current = true;
        setValid(false);
        setShowWarning(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [token, valid]);

  const setToken = useCallback((t: string) => {
    setTokenRaw(t);
    setValid(false);
    setError(undefined);
    setShowWarning(false);
  }, []);

  const disconnect = useCallback(() => {
    setTokenRaw('');
    setValid(false);
    setError(undefined);
    setShowWarning(false);
    localStorage.removeItem(storageKeyToken);
    localStorage.removeItem(storageKeyValid);
  }, [storageKeyToken, storageKeyValid]);

  return {
    token, valid, validating, error, remainingMs, showWarning,
    setToken, setValid, setValidating, setError, setShowWarning,
    disconnect,
  };
}

// ── Provider ─────────────────────────────────────────────────────────────────
export function NexusStatusProvider({ children }: { children: ReactNode }) {
  // Run migration synchronously before any state initializes
  useState(() => { runTokenMigration(); });

  const [claude, setClaude] = useState<ClaudeStatus>({
    connected: false,
    checking: true,
    lastChecked: null,
    cliInstalled: false,
    cliVersion: null,
    authenticated: false,
    plan: null,
    error: null,
  });

  const [tokens, setTokens] = useState<TokenUsage>({ inputTokens: 0, outputTokens: 0 });

  const unocore = useTokenSlot('datasync-token-unocore', 'datasync-is-token-valid-unocore');
  const exec = useTokenSlot('datasync-token-exec', 'datasync-is-token-valid-exec');

  const [pendingTokenSource, setPendingTokenSource] = useState<TokenSource | null>(null);

  const [modals, setModals] = useState<ModalState>({
    claude: false,
    tokens: false,
    apiTokens: false,
  });

  const checkClaude = useCallback(async () => {
    setClaude(prev => ({ ...prev, checking: true }));
    try {
      const status = await window.api.ai.getSubscriptionStatus() as {
        claudeCli: { installed: boolean; version: string | null; error: string | null };
        claudeAuth: { authenticated: boolean; accountEmail: string | null; error: string | null };
        claudeMax: { active: boolean; plan: string | null; error: string | null };
      };
      setClaude({
        connected: status.claudeAuth.authenticated,
        checking: false,
        lastChecked: new Date(),
        cliInstalled: status.claudeCli.installed,
        cliVersion: status.claudeCli.version,
        authenticated: status.claudeAuth.authenticated,
        plan: status.claudeMax.plan,
        error: status.claudeAuth.error ?? status.claudeCli.error,
      });
    } catch {
      setClaude(prev => ({
        ...prev,
        connected: false,
        checking: false,
        lastChecked: new Date(),
        error: 'Check failed',
      }));
    }
  }, []);

  const refreshTokenUsage = useCallback(async () => {
    try {
      const raw = await window.api.ai.getTokenUsage() as
        | { inputTokens: number; outputTokens: number }
        | { claude: { inputTokens: number; outputTokens: number }; local: { inputTokens: number; outputTokens: number } };
      if ('claude' in raw) {
        setTokens({
          inputTokens: raw.claude.inputTokens + raw.local.inputTokens,
          outputTokens: raw.claude.outputTokens + raw.local.outputTokens,
        });
      } else {
        setTokens(raw);
      }
    } catch {
      // silently ignore
    }
  }, []);

  const resetTokenUsage = useCallback(async () => {
    try {
      await window.api.ai.resetTokenUsage();
      setTokens({ inputTokens: 0, outputTokens: 0 });
    } catch {
      // silently ignore
    }
  }, []);

  const openModal = useCallback((modal: ModalKey) => {
    setModals(prev => ({ ...prev, [modal]: true }));
  }, []);

  const closeModal = useCallback((modal: ModalKey) => {
    setModals(prev => ({ ...prev, [modal]: false }));
    if (modal === 'apiTokens') setPendingTokenSource(null);
  }, []);

  const setApiToken = useCallback((source: TokenSource, token: string) => {
    const slot = source === 'unocore' ? unocore : exec;
    slot.setToken(token);
  }, [unocore, exec]);

  const validateApiToken = useCallback(async (source: TokenSource) => {
    const slot = source === 'unocore' ? unocore : exec;
    slot.setValidating(true);
    slot.setError(undefined);
    try {
      const result = await window.api.sync.validateToken(slot.token, source) as {
        valid: boolean;
        message?: string;
        error?: string;
      };
      if (result.valid) {
        slot.setValid(true);
      } else {
        slot.setError(result.error || result.message || 'Validation failed');
      }
    } catch (err) {
      slot.setError(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      slot.setValidating(false);
    }
  }, [unocore, exec]);

  const disconnectApiToken = useCallback((source: TokenSource) => {
    const slot = source === 'unocore' ? unocore : exec;
    slot.disconnect();
  }, [unocore, exec]);

  const requireApiToken = useCallback((source: TokenSource) => {
    const slot = source === 'unocore' ? unocore : exec;
    if (slot.valid && slot.token && !isTokenExpired(slot.token)) return true;
    setPendingTokenSource(source);
    openModal('apiTokens');
    return false;
  }, [unocore, exec, openModal]);

  const clearPendingTokenSource = useCallback(() => {
    setPendingTokenSource(null);
  }, []);

  useEffect(() => {
    checkClaude();
    refreshTokenUsage();
  }, [checkClaude, refreshTokenUsage]);

  useEffect(() => {
    const claudeInterval = setInterval(checkClaude, 60_000);
    const tokenInterval = setInterval(refreshTokenUsage, 30_000);
    return () => {
      clearInterval(claudeInterval);
      clearInterval(tokenInterval);
    };
  }, [checkClaude, refreshTokenUsage]);

  const apiTokens = useMemo<ApiTokensState>(() => ({
    unocore: {
      token: unocore.token,
      isValid: unocore.valid,
      isValidating: unocore.validating,
      error: unocore.error,
      remainingMs: unocore.remainingMs,
      showExpirationWarning: unocore.showWarning,
    },
    exec: {
      token: exec.token,
      isValid: exec.valid,
      isValidating: exec.validating,
      error: exec.error,
      remainingMs: exec.remainingMs,
      showExpirationWarning: exec.showWarning,
    },
  }), [
    unocore.token, unocore.valid, unocore.validating, unocore.error, unocore.remainingMs, unocore.showWarning,
    exec.token, exec.valid, exec.validating, exec.error, exec.remainingMs, exec.showWarning,
  ]);

  const value = useMemo<NexusStatusContextValue>(() => ({
    claude,
    checkClaude,
    tokens,
    refreshTokenUsage,
    resetTokenUsage,
    apiTokens,
    setApiToken,
    validateApiToken,
    disconnectApiToken,
    requireApiToken,
    pendingTokenSource,
    clearPendingTokenSource,
    modals,
    openModal,
    closeModal,
  }), [
    claude, checkClaude, tokens, refreshTokenUsage, resetTokenUsage,
    apiTokens, setApiToken, validateApiToken, disconnectApiToken,
    requireApiToken, pendingTokenSource, clearPendingTokenSource,
    modals, openModal, closeModal,
  ]);

  return (
    <NexusStatusContext.Provider value={value}>
      {children}
    </NexusStatusContext.Provider>
  );
}
