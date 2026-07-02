import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

import { localLlmService } from '../localLlmService'

const BASE_URL = 'http://localhost:8080'

describe('localLlmService', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    localLlmService.resetTokenUsage()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  describe('chatAsync', () => {
    it('sends correct request and returns parsed response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Hello from local LLM' } }],
          usage: { prompt_tokens: 100, completion_tokens: 50 },
        }),
      })

      const result = await localLlmService.chatAsync(
        BASE_URL, 'test-model', 'Hello', 1024, 0.5, 'You are a helper'
      )

      expect(result.text).toBe('Hello from local LLM')
      expect(result.usage).toEqual({ inputTokens: 100, outputTokens: 50 })

      const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(fetchCall[0]).toBe(`${BASE_URL}/v1/chat/completions`)
      const body = JSON.parse(fetchCall[1].body)
      expect(body.model).toBe('test-model')
      expect(body.messages).toEqual([
        { role: 'system', content: 'You are a helper' },
        { role: 'user', content: 'Hello' },
      ])
      expect(body.max_tokens).toBe(1024)
      expect(body.temperature).toBe(0.5)
    })

    it('omits system message when no systemPrompt', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'response' } }],
          usage: { prompt_tokens: 10, completion_tokens: 5 },
        }),
      })

      await localLlmService.chatAsync(BASE_URL, 'model', 'prompt')
      const body = JSON.parse((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
      expect(body.messages).toEqual([{ role: 'user', content: 'prompt' }])
    })

    it('throws on non-200 response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Server crashed'),
      })

      await expect(
        localLlmService.chatAsync(BASE_URL, 'model', 'prompt')
      ).rejects.toThrow(/Local LLM error \(500\)/)
    })

    it('throws on empty response content', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: '' } }],
          usage: {},
        }),
      })

      await expect(
        localLlmService.chatAsync(BASE_URL, 'model', 'prompt')
      ).rejects.toThrow('Empty response from local LLM')
    })

    it('accumulates token usage across calls', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'ok' } }],
          usage: { prompt_tokens: 100, completion_tokens: 50 },
        }),
      })

      await localLlmService.chatAsync(BASE_URL, 'model', 'prompt1')
      await localLlmService.chatAsync(BASE_URL, 'model', 'prompt2')

      expect(localLlmService.getTokenUsage()).toEqual({
        inputTokens: 200,
        outputTokens: 100,
      })
    })

    it('handles missing usage data gracefully', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'no usage' } }],
        }),
      })

      const result = await localLlmService.chatAsync(BASE_URL, 'model', 'prompt')
      expect(result.usage).toEqual({ inputTokens: 0, outputTokens: 0 })
    })
  })

  describe('checkHealth', () => {
    it('returns available=true with models when server responds', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: [{ id: 'model-a' }, { id: 'model-b' }],
        }),
      })

      const result = await localLlmService.checkHealth(BASE_URL)
      expect(result).toEqual({
        available: true,
        models: ['model-a', 'model-b'],
      })
    })

    it('returns available=false when server returns non-200', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: false })

      const result = await localLlmService.checkHealth(BASE_URL)
      expect(result).toEqual({ available: false, models: [] })
    })

    it('returns available=false when fetch throws (unreachable)', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))

      const result = await localLlmService.checkHealth(BASE_URL)
      expect(result).toEqual({ available: false, models: [] })
    })
  })

  describe('token tracking', () => {
    it('resets usage to zero', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'ok' } }],
          usage: { prompt_tokens: 100, completion_tokens: 50 },
        }),
      })

      await localLlmService.chatAsync(BASE_URL, 'model', 'prompt')
      expect(localLlmService.getTokenUsage().inputTokens).toBe(100)

      localLlmService.resetTokenUsage()
      expect(localLlmService.getTokenUsage()).toEqual({ inputTokens: 0, outputTokens: 0 })
    })
  })
})
