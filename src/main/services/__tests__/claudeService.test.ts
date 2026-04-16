import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@anthropic-ai/claude-agent-sdk', () => ({
  query: vi.fn(),
}))

vi.mock('electron', () => ({
  app: {
    getVersion: vi.fn(() => '1.0.0'),
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

describe('claudeService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('chatAsync', () => {
    it('should call claude-agent-sdk query with correct options', async () => {
      const { query } = await import('@anthropic-ai/claude-agent-sdk')
      const mockQuery = vi.mocked(query)

      async function* mockGenerator() {
        yield { type: 'result', result: 'AI response text', usage: { input_tokens: 100, output_tokens: 50 } }
      }
      mockQuery.mockReturnValue(mockGenerator() as any)

      const { claudeService } = await import('../claudeService')
      const result = await claudeService.chatAsync('claude-3-haiku', 'Test prompt')

      expect(result).toBe('AI response text')
      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'Test prompt',
          options: expect.objectContaining({
            model: 'claude-3-haiku',
            maxTurns: 1,
            allowedTools: [],
            permissionMode: 'auto',
          }),
        })
      )
    })

    it('should throw on empty response', async () => {
      const { query } = await import('@anthropic-ai/claude-agent-sdk')
      const mockQuery = vi.mocked(query)

      async function* mockGenerator() {
        yield { type: 'result', result: '', usage: { input_tokens: 10, output_tokens: 0 } }
      }
      mockQuery.mockReturnValue(mockGenerator() as any)

      const { claudeService } = await import('../claudeService')
      await expect(claudeService.chatAsync('claude-3-haiku', 'prompt')).rejects.toThrow('Empty response from Claude SDK')
    })

    it('should recover accumulated text when SDK throws max turns error', async () => {
      const { query } = await import('@anthropic-ai/claude-agent-sdk')
      const mockQuery = vi.mocked(query)

      async function* mockGenerator() {
        yield {
          type: 'assistant',
          message: {
            content: [{ type: 'text', text: 'Vigil response text' }],
          },
        }
        throw new Error('Claude Code returned an error result: Reached maximum number of turns (1)')
      }
      mockQuery.mockReturnValue(mockGenerator() as any)

      const { claudeService } = await import('../claudeService')
      const result = await claudeService.chatAsync('claude-3-haiku', 'prompt')

      expect(result).toBe('Vigil response text')
    })

    it('should re-throw max turns error when no text was accumulated', async () => {
      const { query } = await import('@anthropic-ai/claude-agent-sdk')
      const mockQuery = vi.mocked(query)

      async function* mockGenerator() {
        throw new Error('Claude Code returned an error result: Reached maximum number of turns (1)')
      }
      mockQuery.mockReturnValue(mockGenerator() as any)

      const { claudeService } = await import('../claudeService')
      await expect(claudeService.chatAsync('claude-3-haiku', 'prompt')).rejects.toThrow('maximum number of turns')
    })

    it('should accumulate text blocks from assistant messages', async () => {
      const { query } = await import('@anthropic-ai/claude-agent-sdk')
      const mockQuery = vi.mocked(query)

      async function* mockGenerator() {
        yield {
          type: 'assistant',
          message: {
            content: [
              { type: 'text', text: 'Part 1 ' },
              { type: 'text', text: 'Part 2' },
            ],
          },
        }
        yield { type: 'result', result: undefined, usage: { input_tokens: 50, output_tokens: 25 } }
      }
      mockQuery.mockReturnValue(mockGenerator() as any)

      const { claudeService } = await import('../claudeService')
      const result = await claudeService.chatAsync('claude-3-haiku', 'prompt')

      expect(result).toBe('Part 1 Part 2')
    })
  })

  describe('getTokenUsage', () => {
    it('should return cumulative token usage', async () => {
      const { claudeService } = await import('../claudeService')
      const usage = claudeService.getTokenUsage()
      expect(usage).toHaveProperty('inputTokens')
      expect(usage).toHaveProperty('outputTokens')
      expect(typeof usage.inputTokens).toBe('number')
      expect(typeof usage.outputTokens).toBe('number')
    })
  })

  describe('resetTokenUsage', () => {
    it('should reset cumulative usage to zero', async () => {
      const { claudeService } = await import('../claudeService')
      claudeService.resetTokenUsage()
      const usage = claudeService.getTokenUsage()
      expect(usage.inputTokens).toBe(0)
      expect(usage.outputTokens).toBe(0)
    })
  })

  describe('checkAvailability', () => {
    it('should return boolean availability', async () => {
      vi.doMock('../subscriptionService', () => ({
        subscriptionService: {
          checkClaudeAuth: vi.fn().mockResolvedValue({ authenticated: true }),
        },
      }))

      const { claudeService } = await import('../claudeService')
      const result = await claudeService.checkAvailability()
      expect(typeof result).toBe('boolean')
    })
  })
})
