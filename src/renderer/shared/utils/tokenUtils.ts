interface DecodedPayload {
  sub?: string;
  email?: string;
  name?: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

export const validateJwtStructure = (token: string): boolean => {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  return parts.length === 3;
};

/** Convert Base64URL to standard Base64 for atob() compatibility */
const base64UrlToBase64 = (base64url: string): string => {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  if (pad) base64 += '='.repeat(4 - pad);
  return base64;
};

export const decodeTokenPayload = (token: string): DecodedPayload | null => {
  if (!validateJwtStructure(token)) return null;
  try {
    const parts = token.split('.');
    return JSON.parse(atob(base64UrlToBase64(parts[1]))) as DecodedPayload;
  } catch {
    return null;
  }
};

export const getTokenExpiration = (token: string): Date | null => {
  const payload = decodeTokenPayload(token);
  if (!payload?.exp) return null;
  return new Date(payload.exp * 1000);
};

export const isTokenExpired = (token: string): boolean => {
  const expiresAt = getTokenExpiration(token);
  if (!expiresAt) return true;
  return Date.now() > expiresAt.getTime();
};

export const formatCountdown = (ms: number): string => {
  if (ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map(v => String(v).padStart(2, '0')).join(':');
};
