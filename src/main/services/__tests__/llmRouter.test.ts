import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

const mockClaudeChatAsync = vi.fn().mockResolvedValue({ text: 'claude-response', usage: { inputTokens: 10, outputTokens: 5 } })
const mockClaudeGetTokenUsage = vi.fn().mockReturnValue({ inputTokens: 100, outputTokens: 50 })
const mockClaudeResetTokenUsage = vi.fn()

vi.mock('../claudeService', () => ({
  claudeService: {
    chatAsync: (...args: unknown[]) => mockClaudeChatAsync(...args),
    getTokenUsage: () => mockClaudeGetTokenUsage(),
    resetTokenUsage: () => mockClaudeResetTokenUsage(),
  },
}))

const mockLocalChatAsync = vi.fn().mockResolvedValue({ text: 'local-response', usage: { inputTokens: 20, outputTokens: 10 } })
const mockLocalGetTokenUsage = vi.fn().mockReturnValue({ inputTokens: 200, outputTokens: 100 })
const mockLocalResetTokenUsage = vi.fn()

vi.mock('../localLlmService', () => ({
  localLlmService: {
    chatAsync: (...args: unknown[]) => mockLocalChatAsync(...args),
    getTokenUsage: () => mockLocalGetTokenUsage(),
    resetTokenUsage: () => mockLocalResetTokenUsage(),
  },
}))

const defaultMockConfig = {
  modelConfig: {
    presetMode: 'custom',
    localServerUrl: 'http://localhost:8080',
    localDefaultModel: 'test-local-model',
    concurrency: {
      claude: { max: 8, haikuMax: 20 },
      local: { max: 2 },
    },
    features: {
      resumeSkillExtraction: { provider: 'claude', model: 'claude-haiku-4-5' },
      resumeFormatCheck: { provider: 'claude', model: 'claude-sonnet-4-6' },
      resumeTransform: { provider: 'local', model: 'qwen-32b' },
      candidateProfile: { provider: 'claude', model: 'claude-sonnet-4-6' },
      coverLetter: { provider: 'claude', model: 'claude-sonnet-4-6' },
      matchTriage: { provider: 'claude', model: 'claude-haiku-4-5' },
      matchDeepAnalysis: { provider: 'claude', model: 'claude-opus-4-8' },
      benchBurnAnalysis: { provider: 'local', model: 'qwen-32b' },
      responsivenessAnalysis: { provider: 'claude', model: 'claude-sonnet-4-6' },
      responsivenessReport: { provider: 'claude', model: 'claude-sonnet-4-6' },
      bugDescription: { provider: 'claude', model: 'claude-haiku-4-5' },
      aiChat: { provider: 'claude', model: 'claude-sonnet-4-6' },
    },
  },
}

const mockGetConfig = vi.fn().mockReturnValue(defaultMockConfig)

vi.mock('../../config', () => ({
  getConfig: (...args: unknown[]) => mockGetConfig(...args),
}))

import { llmRouter } from '../llmRouter'

describe('llmRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('chatAsync', () => {
    it('routes claude-provider features to claudeService', async () => {
      const result = await llmRouter.chatAsync('aiChat', 'Hello', 4096, 0.1, 'system')
      expect(mockClaudeChatAsync).toHaveBeenCalledWith(
        'claude-sonnet-4-6', 'Hello', 4096, 0.1, 'system', undefined
      )
      expect(result.text).toBe('claude-response')
    })

    it('routes local-provider features to localLlmService', async () => {
      const result = await llmRouter.chatAsync('resumeTransform', 'Transform this', 2600, 0.2)
      expect(mockLocalChatAsync).toHaveBeenCalledWith(
        'http://localhost:8080', 'qwen-32b', 'Transform this', 2600, 0.2, undefined, undefined
      )
      expect(result.text).toBe('local-response')
    })

    it('routes benchBurnAnalysis to local provider per config', async () => {
      await llmRouter.chatAsync('benchBurnAnalysis', 'Analyze', 4096, 0.1)
      expect(mockLocalChatAsync).toHaveBeenCalledWith(
        'http://localhost:8080', 'qwen-32b', 'Analyze', 4096, 0.1, undefined, undefined
      )
      expect(mockClaudeChatAsync).not.toHaveBeenCalled()
    })

    it('throws when localServerUrl is empty for local-provider feature', async () => {
      mockGetConfig.mockReturnValueOnce({
        ...defaultMockConfig,
        modelConfig: { ...defaultMockConfig.modelConfig, localServerUrl: '' },
      })

      await expect(llmRouter.chatAsync('resumeTransform', 'Hello', 4096, 0.1))
        .rejects.toThrow('no server URL set')
    })

    it('passes AbortSignal through to the provider', async () => {
      const abort = new AbortController()
      await llmRouter.chatAsync('aiChat', 'Hello', 4096, 0.1, undefined, abort.signal)
      expect(mockClaudeChatAsync).toHaveBeenCalledWith(
        'claude-sonnet-4-6', 'Hello', 4096, 0.1, undefined, abort.signal
      )
    })
  })

  describe('getConcurrencyLimit', () => {
    it('returns haikuMax for haiku-tier claude features', () => {
      expect(llmRouter.getConcurrencyLimit('resumeSkillExtraction')).toBe(20)
      expect(llmRouter.getConcurrencyLimit('matchTriage')).toBe(20)
      expect(llmRouter.getConcurrencyLimit('bugDescription')).toBe(20)
    })

    it('returns claude.max for non-haiku claude features', () => {
      expect(llmRouter.getConcurrencyLimit('aiChat')).toBe(8)
      expect(llmRouter.getConcurrencyLimit('matchDeepAnalysis')).toBe(8)
    })

    it('returns local.max for local-provider features', () => {
      expect(llmRouter.getConcurrencyLimit('resumeTransform')).toBe(2)
      expect(llmRouter.getConcurrencyLimit('benchBurnAnalysis')).toBe(2)
    })
  })

  describe('getTokenUsage', () => {
    it('returns combined usage from both providers', () => {
      const usage = llmRouter.getTokenUsage()
      expect(usage).toEqual({
        claude: { inputTokens: 100, outputTokens: 50 },
        local: { inputTokens: 200, outputTokens: 100 },
      })
    })
  })

  describe('resetTokenUsage', () => {
    it('resets both providers', () => {
      llmRouter.resetTokenUsage()
      expect(mockClaudeResetTokenUsage).toHaveBeenCalledOnce()
      expect(mockLocalResetTokenUsage).toHaveBeenCalledOnce()
    })
  })
})
