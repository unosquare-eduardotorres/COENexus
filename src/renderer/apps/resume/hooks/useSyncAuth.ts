import { useState, useCallback, useEffect, useMemo } from 'react';
import { dataSyncService } from '../services/dataSyncService';
import { isTokenExpired, getTokenExpiration } from '../utils/tokenUtils';
import { createRendererLogger } from '../utils/rendererLogger';

const log = createRendererLogger('useSyncAuth');

function safeParseJSON<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

export function useSyncAuth() {
  const [token, setToken] = useState(() =>
    localStorage.getItem('datasync-token') ?? ''
  );
  const [isTokenValid, setIsTokenValid] = useState(() => {
    const storedToken = localStorage.getItem('datasync-token') ?? '';
    const wasValid = safeParseJSON(localStorage.getItem('datasync-is-token-valid'), false);
    if (wasValid && storedToken && !isTokenExpired(storedToken)) return true;
    return false;
  });
  const [hasEntered, setHasEntered] = useState(() => {
    const storedToken = localStorage.getItem('datasync-token') ?? '';
    const wasValid = safeParseJSON(localStorage.getItem('datasync-is-token-valid'), false);
    if (wasValid && storedToken && !isTokenExpired(storedToken)) return true;
    return localStorage.getItem('datasync-entered') === 'true';
  });
  const [isValidating, setIsValidating] = useState(false);
  const [tokenError, setTokenError] = useState<string | undefined>();
  const [showExpirationWarning, setShowExpirationWarning] = useState(false);

  const minutesRemaining = useMemo(() => {
    const expiresAt = getTokenExpiration(token);
    if (!expiresAt) return Infinity;
    return Math.max(0, (expiresAt.getTime() - Date.now()) / 60_000);
  }, [token, showExpirationWarning]);

  useEffect(() => {
    if (token) {
      localStorage.setItem('datasync-token', token);
    } else {
      localStorage.removeItem('datasync-token');
    }
  }, [token]);

  useEffect(() => {
    localStorage.setItem('datasync-is-token-valid', JSON.stringify(isTokenValid));
  }, [isTokenValid]);

  useEffect(() => {
    if (hasEntered) {
      localStorage.setItem('datasync-entered', 'true');
    }
  }, [hasEntered]);

  const handleValidate = useCallback(async () => {
    setIsValidating(true);
    setTokenError(undefined);
    const result = await dataSyncService.validateToken(token);
    setIsValidating(false);
    if (result.valid) {
      setIsTokenValid(true);
      setHasEntered(true);
    } else {
      setTokenError(result.error);
    }
  }, [token]);

  const handleDisconnect = useCallback(() => {
    setToken('');
    setIsTokenValid(false);
    setTokenError(undefined);
    setShowExpirationWarning(false);
    localStorage.removeItem('datasync-token');
    localStorage.removeItem('datasync-is-token-valid');
  }, []);

  const handleContinueWithoutToken = useCallback(() => {
    setHasEntered(true);
  }, []);

  const handleTokenExpired = useCallback(() => {
    setShowExpirationWarning(true);
  }, []);

  const handleRefreshToken = useCallback(() => {
    handleDisconnect();
  }, [handleDisconnect]);

  return {
    token,
    setToken,
    isTokenValid,
    hasEntered,
    setHasEntered,
    isValidating,
    tokenError,
    showExpirationWarning,
    setShowExpirationWarning,
    minutesRemaining,
    handleValidate,
    handleDisconnect,
    handleContinueWithoutToken,
    handleTokenExpired,
    handleRefreshToken,
  };
}
