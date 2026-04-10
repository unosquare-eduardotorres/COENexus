import { useState, useCallback, useEffect, useMemo } from 'react';
import { dataSyncService } from '../services/dataSyncService';
import { isTokenExpired, getTokenExpiration } from '../../../shared/utils/tokenUtils';
import { safeJsonParse as safeParseJSON } from '../../../shared/utils/safeJsonParse';

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

  const handleValidate = useCallback(async () => {
    setIsValidating(true);
    setTokenError(undefined);
    const result = await dataSyncService.validateToken(token);
    setIsValidating(false);
    if (result.valid) {
      setIsTokenValid(true);
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
    isValidating,
    tokenError,
    showExpirationWarning,
    setShowExpirationWarning,
    minutesRemaining,
    handleValidate,
    handleDisconnect,
    handleTokenExpired,
    handleRefreshToken,
  };
}
