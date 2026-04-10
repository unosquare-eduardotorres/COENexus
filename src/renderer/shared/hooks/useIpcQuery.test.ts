import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useIpcQuery, useIpcMutation, useInvalidateQueries } from './useIpcQuery';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useIpcQuery', () => {
  it('should return data from the query function', async () => {
    const mockFn = vi.fn().mockResolvedValue({ count: 42 });

    const { result } = renderHook(
      () => useIpcQuery(['test', 'data'], mockFn),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ count: 42 });
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should handle errors gracefully', async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('IPC failed'));

    const { result } = renderHook(
      () => useIpcQuery(['test', 'error'], mockFn),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('IPC failed');
  });

  it('should respect enabled option', async () => {
    const mockFn = vi.fn().mockResolvedValue('data');

    const { result } = renderHook(
      () => useIpcQuery(['test', 'disabled'], mockFn, { enabled: false }),
      { wrapper: createWrapper() }
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockFn).not.toHaveBeenCalled();
  });
});

describe('useIpcMutation', () => {
  it('should execute mutation and return data', async () => {
    const mockFn = vi.fn().mockResolvedValue({ id: 1, name: 'Test' });

    const { result } = renderHook(
      () => useIpcMutation(mockFn),
      { wrapper: createWrapper() }
    );

    result.current.mutate({ name: 'Test' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ id: 1, name: 'Test' });
    expect(mockFn).toHaveBeenCalledWith({ name: 'Test' });
  });

  it('should handle mutation errors', async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('Save failed'));

    const { result } = renderHook(
      () => useIpcMutation(mockFn),
      { wrapper: createWrapper() }
    );

    result.current.mutate(undefined);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Save failed');
  });
});

describe('useInvalidateQueries', () => {
  it('should return a function', () => {
    const { result } = renderHook(
      () => useInvalidateQueries(),
      { wrapper: createWrapper() }
    );
    expect(typeof result.current).toBe('function');
  });
});
