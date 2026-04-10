import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSyncAuth } from './useSyncAuth';

vi.mock('../services/dataSyncService', () => ({
  dataSyncService: {
    validateToken: vi.fn().mockResolvedValue({ valid: true }),
  },
}));

vi.mock('../utils/tokenUtils', () => ({
  isTokenExpired: vi.fn().mockReturnValue(false),
  getTokenExpiration: vi.fn().mockReturnValue(null),
}));

vi.mock('../utils/rendererLogger', () => ({
  createRendererLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('useSyncAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should initialize with empty token', () => {
    const { result } = renderHook(() => useSyncAuth());

    expect(result.current.token).toBe('');
    expect(result.current.isTokenValid).toBe(false);
    expect(result.current.isValidating).toBe(false);
  });

  it('should restore token from localStorage', () => {
    localStorage.setItem('datasync-token', 'stored-token');

    const { result } = renderHook(() => useSyncAuth());

    expect(result.current.token).toBe('stored-token');
  });

  it('should update token', () => {
    const { result } = renderHook(() => useSyncAuth());

    act(() => {
      result.current.setToken('new-token');
    });

    expect(result.current.token).toBe('new-token');
  });

  it('should handle disconnect', () => {
    localStorage.setItem('datasync-token', 'test-token');
    localStorage.setItem('datasync-is-token-valid', 'true');

    const { result } = renderHook(() => useSyncAuth());

    act(() => {
      result.current.handleDisconnect();
    });

    expect(result.current.token).toBe('');
    expect(result.current.isTokenValid).toBe(false);
  });

  it('should handle token expired warning', () => {
    const { result } = renderHook(() => useSyncAuth());

    expect(result.current.showExpirationWarning).toBe(false);

    act(() => {
      result.current.handleTokenExpired();
    });

    expect(result.current.showExpirationWarning).toBe(true);
  });
});
