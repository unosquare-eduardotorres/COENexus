import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config', () => ({
  getConfig: vi.fn(() => ({
    voyage: {
      apiUrl: 'https://api.voyageai.com/v1',
      defaultModel: 'voyage-4-large',
      apiKeys: ['test-key-1', 'test-key-2'],
    },
  })),
}))

vi.mock('../keychainService', () => ({
  keychainService: {
    getVoyageKeys: vi.fn().mockReturnValue([]),
  },
}))

vi.mock('../logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

const mockFetch = vi.fn()
globalThis.fetch = mockFetch

describe('voyageEmbeddingService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateEmbedding', () => {
    it('should call Voyage API with correct parameters', async () => {
      const embedding = Array.from({ length: 1024 }, (_, i) => i * 0.001)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [{ embedding }] }),
      })

      const { voyageEmbeddingService } = await import('../voyageEmbeddingService')
      const result = await voyageEmbeddingService.generateEmbedding('test text')

      expect(mockFetch).toHaveBeenCalledOnce()
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe('https://api.voyageai.com/v1/embeddings')
      expect(options.method).toBe('POST')
      expect(JSON.parse(options.body)).toEqual({
        input: ['test text'],
        model: 'voyage-4-large',
      })
      expect(result).toBeInstanceOf(Float32Array)
      expect(result.length).toBe(1024)
    })

    it('should throw on non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers(),
      })

      const { voyageEmbeddingService } = await import('../voyageEmbeddingService')
      await expect(
        voyageEmbeddingService.generateEmbedding('test')
      ).rejects.toThrow('Voyage API error 500')
    })

    it('should throw on empty embedding response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      })

      const { voyageEmbeddingService } = await import('../voyageEmbeddingService')
      await expect(
        voyageEmbeddingService.generateEmbedding('test')
      ).rejects.toThrow('Empty embedding response')
    })

    it('should use custom model when provided', async () => {
      const embedding = Array.from({ length: 512 }, () => 0.1)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [{ embedding }] }),
      })

      const { voyageEmbeddingService } = await import('../voyageEmbeddingService')
      await voyageEmbeddingService.generateEmbedding('test', 'voyage-code-3')

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.model).toBe('voyage-code-3')
    })

    it('should retry on 429 rate limit', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: new Headers({ 'retry-after': '0' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: [{ embedding: [0.1, 0.2] }] }),
        })

      const { voyageEmbeddingService } = await import('../voyageEmbeddingService')
      const result = await voyageEmbeddingService.generateEmbedding('test')

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result).toBeInstanceOf(Float32Array)
    })

    it('should include authorization header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [{ embedding: [0.1] }] }),
      })

      const { voyageEmbeddingService } = await import('../voyageEmbeddingService')
      await voyageEmbeddingService.generateEmbedding('test')

      const headers = mockFetch.mock.calls[0][1].headers
      expect(headers['Authorization']).toMatch(/^Bearer /)
    })
  })

  describe('key rotation logic', () => {
    it('should throw when no API keys available', () => {
      const createKeyRotator = () => {
        let keyIndex = 0
        return {
          getNextApiKey(allKeys: string[]): string {
            if (allKeys.length === 0) throw new Error('Voyage API key not configured')
            const key = allKeys[keyIndex % allKeys.length]
            keyIndex++
            return key
          },
        }
      }

      const rotator = createKeyRotator()
      expect(() => rotator.getNextApiKey([])).toThrow('Voyage API key not configured')
    })

    it('should rotate through keys round-robin', () => {
      const createKeyRotator = () => {
        let keyIndex = 0
        return {
          getNextApiKey(allKeys: string[]): string {
            if (allKeys.length === 0) throw new Error('Voyage API key not configured')
            const key = allKeys[keyIndex % allKeys.length]
            keyIndex++
            return key
          },
        }
      }

      const rotator = createKeyRotator()
      const keys = ['key-a', 'key-b', 'key-c']
      expect(rotator.getNextApiKey(keys)).toBe('key-a')
      expect(rotator.getNextApiKey(keys)).toBe('key-b')
      expect(rotator.getNextApiKey(keys)).toBe('key-c')
      expect(rotator.getNextApiKey(keys)).toBe('key-a')
    })
  })
})
