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
  validateJwtStructure,
  decodeTokenPayload,
} from '../shared/utils/tokenUtils';
import { safeJsonParse } from '../shared/utils/safeJsonParse';

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

interface SharePointStatus {
  token: string;
  isValid: boolean;
  isValidating: boolean;
  error?: string;
  remainingMs: number;
  showExpirationWarning: boolean;
}

interface ModalState {
  claude: boolean;
  tokens: boolean;
  sharepoint: boolean;
}

type ModalKey = 'claude' | 'tokens' | 'sharepoint';

export interface AgentActivity {
  id: string;
  name: string;
  status: 'running' | 'queued';
  runId: string | null;
}

interface NexusStatusContextValue {
  claude: ClaudeStatus;
  checkClaude: () => Promise<void>;
  tokens: TokenUsage;
  refreshTokenUsage: () => Promise<void>;
  resetTokenUsage: () => Promise<void>;
  sharepoint: SharePointStatus;
  setSharePointToken: (token: string) => void;
  validateSharePoint: () => Promise<void>;
  disconnectSharePoint: () => void;
  requireSharePointToken: () => boolean;
  modals: ModalState;
  openModal: (modal: ModalKey) => void;
  closeModal: (modal: ModalKey) => void;
  agentActivities: AgentActivity[];
  setAgentActivities: (activities: AgentActivity[]) => void;
}

const NexusStatusContext = createContext<NexusStatusContextValue | null>(null);

export function useNexusStatus(): NexusStatusContextValue {
  const ctx = useContext(NexusStatusContext);
  if (!ctx) throw new Error('useNexusStatus must be used within NexusStatusProvider');
  return ctx;
}

export function NexusStatusProvider({ children }: { children: ReactNode }) {
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

  const [spToken, setSpToken] = useState(() =>
    localStorage.getItem('datasync-token') ?? ''
  );
  const [spValid, setSpValid] = useState(() => {
    const storedToken = localStorage.getItem('datasync-token') ?? '';
    const wasValid = safeJsonParse(localStorage.getItem('datasync-is-token-valid'), false);
    if (wasValid && storedToken && !isTokenExpired(storedToken)) return true;
    return false;
  });
  const [spValidating, setSpValidating] = useState(false);
  const [spError, setSpError] = useState<string | undefined>();
  const [spRemainingMs, setSpRemainingMs] = useState(0);
  const [spShowWarning, setSpShowWarning] = useState(false);

  const [agentActivities, setAgentActivities] = useState<AgentActivity[]>([]);

  const [modals, setModals] = useState<ModalState>({
    claude: false,
    tokens: false,
    sharepoint: false,
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
      const usage = await window.api.ai.getTokenUsage() as { inputTokens: number; outputTokens: number };
      setTokens(usage);
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

  useEffect(() => {
    if (spToken) {
      localStorage.setItem('datasync-token', spToken);
    } else {
      localStorage.removeItem('datasync-token');
    }
  }, [spToken]);

  useEffect(() => {
    localStorage.setItem('datasync-is-token-valid', JSON.stringify(spValid));
  }, [spValid]);

  const setSharePointToken = useCallback((token: string) => {
    setSpToken(token);
    setSpValid(false);
    setSpError(undefined);
    setSpShowWarning(false);
  }, []);

  const validateSharePoint = useCallback(async () => {
    setSpValidating(true);
    setSpError(undefined);
    try {
      const result = await window.api.sync.validateToken(spToken) as { valid: boolean; error?: string };
      if (result.valid) {
        setSpValid(true);
      } else {
        setSpError(result.error ?? 'Validation failed');
      }
    } catch (err) {
      setSpError(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      setSpValidating(false);
    }
  }, [spToken]);

  const disconnectSharePoint = useCallback(() => {
    setSpToken('');
    setSpValid(false);
    setSpError(undefined);
    setSpShowWarning(false);
    localStorage.removeItem('datasync-token');
    localStorage.removeItem('datasync-is-token-valid');
  }, []);

  const openModal = useCallback((modal: ModalKey) => {
    setModals(prev => ({ ...prev, [modal]: true }));
  }, []);

  const closeModal = useCallback((modal: ModalKey) => {
    setModals(prev => ({ ...prev, [modal]: false }));
  }, []);

  const requireSharePointToken = useCallback(() => {
    if (spValid && spToken && !isTokenExpired(spToken)) return true;
    openModal('sharepoint');
    return false;
  }, [spValid, spToken, openModal]);

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

  const spExpiredRef = useRef(false);

  useEffect(() => {
    spExpiredRef.current = false;

    const computeRemaining = () => {
      const expiresAt = getTokenExpiration(spToken);
      if (!expiresAt) return 0;
      return Math.max(0, expiresAt.getTime() - Date.now());
    };

    setSpRemainingMs(computeRemaining());

    const interval = setInterval(() => {
      const ms = computeRemaining();
      setSpRemainingMs(ms);

      if (ms <= 0 && spValid && !spExpiredRef.current) {
        spExpiredRef.current = true;
        setSpValid(false);
        setSpShowWarning(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [spToken, spValid]);

  const sharepoint = useMemo<SharePointStatus>(() => ({
    token: spToken,
    isValid: spValid,
    isValidating: spValidating,
    error: spError,
    remainingMs: spRemainingMs,
    showExpirationWarning: spShowWarning,
  }), [spToken, spValid, spValidating, spError, spRemainingMs, spShowWarning]);

  const localValidation = useMemo(() => {
    const trimmed = spToken.trim();
    if (!trimmed) return 'idle';
    if (!validateJwtStructure(trimmed)) return 'invalid-structure';
    const payload = decodeTokenPayload(trimmed);
    if (!payload) return 'invalid-structure';
    if (payload.exp && isTokenExpired(trimmed)) return 'expired';
    return 'valid';
  }, [spToken]);

  void localValidation;

  const value = useMemo<NexusStatusContextValue>(() => ({
    claude,
    checkClaude,
    tokens,
    refreshTokenUsage,
    resetTokenUsage,
    sharepoint,
    setSharePointToken,
    validateSharePoint,
    disconnectSharePoint,
    requireSharePointToken,
    modals,
    openModal,
    closeModal,
    agentActivities,
    setAgentActivities,
  }), [
    claude, checkClaude, tokens, refreshTokenUsage, resetTokenUsage,
    sharepoint, setSharePointToken, validateSharePoint, disconnectSharePoint,
    requireSharePointToken, modals, openModal, closeModal,
    agentActivities,
  ]);

  return (
    <NexusStatusContext.Provider value={value}>
      {children}
    </NexusStatusContext.Provider>
  );
}
