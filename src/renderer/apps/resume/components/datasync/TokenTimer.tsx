import { useState, useEffect, useCallback } from 'react';
import { getTokenExpiration, formatCountdown } from '../../utils/tokenUtils';

interface TokenTimerProps {
  token: string;
  onExpired: () => void;
}

type UrgencyLevel = 'safe' | 'warning' | 'critical';

const urgencyStyles: Record<UrgencyLevel, string> = {
  safe: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  warning: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  critical: 'text-red-500 bg-red-500/10 border-red-500/20',
};

function getUrgencyLevel(ms: number): UrgencyLevel {
  const minutes = ms / 60_000;
  if (minutes > 30) return 'safe';
  if (minutes > 10) return 'warning';
  return 'critical';
}

export default function TokenTimer({ token, onExpired }: TokenTimerProps) {
  const [remainingMs, setRemainingMs] = useState<number>(0);
  const [hasExpired, setHasExpired] = useState(false);

  const computeRemaining = useCallback(() => {
    const expiresAt = getTokenExpiration(token);
    if (!expiresAt) return 0;
    return Math.max(0, expiresAt.getTime() - Date.now());
  }, [token]);

  useEffect(() => {
    setRemainingMs(computeRemaining());
    setHasExpired(false);

    const interval = setInterval(() => {
      const ms = computeRemaining();
      setRemainingMs(ms);

      if (ms <= 0 && !hasExpired) {
        setHasExpired(true);
        onExpired();
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [token, computeRemaining, onExpired, hasExpired]);

  const urgency = getUrgencyLevel(remainingMs);

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-medium ${urgencyStyles[urgency]}`}
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
        <path strokeLinecap="round" strokeWidth="1.5" d="M12 6v6l4 2" />
      </svg>
      {formatCountdown(remainingMs)}
    </div>
  );
}
