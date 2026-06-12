import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

vi.mock('../claudeService', () => ({
  claudeService: {
    checkAvailability: vi.fn(),
    chatAsync: vi.fn(),
  },
}))

import { pathAiService } from '../pathAiService'
import { claudeService } from '../claudeService'

describe('pathAiService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateDefensePrepKit', () => {
    const defaultParams = {
      candidateName: 'Alice',
      targetLevel: 'Senior',
      rubricScores: [{ dimension: 'Design', score: 8, maxScore: 10 }],
      codeReviewStrengths: ['Clean code', 'Good tests'],
    }

    it('should return unavailable message when Claude is not available', async () => {
      vi.mocked(claudeService.checkAvailability).mockResolvedValue(false)

      const result = await pathAiService.generateDefensePrepKit(defaultParams)
      expect(result.prepKit).toContain('unavailable')
      expect(result.suggestedQuestions).toEqual([])
      expect(claudeService.chatAsync).not.toHaveBeenCalled()
    })

    it('should parse valid JSON response from Claude', async () => {
      vi.mocked(claudeService.checkAvailability).mockResolvedValue(true)
      vi.mocked(claudeService.chatAsync).mockResolvedValue({ text: JSON.stringify({
        prepKit: 'Alice has strong design skills.',
        suggestedQuestions: ['Describe your approach to system design.', 'How do you handle code reviews?'],
      }), usage: { inputTokens: 0, outputTokens: 0 } })

      const result = await pathAiService.generateDefensePrepKit(defaultParams)
      expect(result.prepKit).toBe('Alice has strong design skills.')
      expect(result.suggestedQuestions).toHaveLength(2)
    })

    it('should fallback gracefully when response is not valid JSON', async () => {
      vi.mocked(claudeService.checkAvailability).mockResolvedValue(true)
      vi.mocked(claudeService.chatAsync).mockResolvedValue({ text: 'Here is your prep kit: good candidate.', usage: { inputTokens: 0, outputTokens: 0 } })

      const result = await pathAiService.generateDefensePrepKit(defaultParams)
      expect(result.prepKit).toBe('Here is your prep kit: good candidate.')
      expect(result.suggestedQuestions).toEqual([])
    })

    it('should extract JSON from mixed text response', async () => {
      vi.mocked(claudeService.checkAvailability).mockResolvedValue(true)
      vi.mocked(claudeService.chatAsync).mockResolvedValue({ text:
        'Here is the result:\n{"prepKit": "Great candidate", "suggestedQuestions": ["Q1"]}\nEnd.',
        usage: { inputTokens: 0, outputTokens: 0 } })

      const result = await pathAiService.generateDefensePrepKit(defaultParams)
      expect(result.prepKit).toBe('Great candidate')
      expect(result.suggestedQuestions).toEqual(['Q1'])
    })
  })

  describe('generateRemediationPath', () => {
    const defaultParams = {
      candidateName: 'Bob',
      scorecardGaps: [{ dimension: 'Architecture', score: 4, threshold: 7 }],
      evaluatorNotes: 'Needs more experience with distributed systems.',
    }

    it('should return unavailable message when Claude is not available', async () => {
      vi.mocked(claudeService.checkAvailability).mockResolvedValue(false)

      const result = await pathAiService.generateRemediationPath(defaultParams)
      expect(result.plan).toContain('unavailable')
      expect(result.focusAreas).toEqual([])
    })

    it('should parse valid JSON response', async () => {
      vi.mocked(claudeService.checkAvailability).mockResolvedValue(true)
      vi.mocked(claudeService.chatAsync).mockResolvedValue({ text: JSON.stringify({
        plan: 'Focus on distributed systems.',
        focusAreas: ['System Design', 'Event-driven patterns'],
        timeline: '8-12 weeks',
      }), usage: { inputTokens: 0, outputTokens: 0 } })

      const result = await pathAiService.generateRemediationPath(defaultParams)
      expect(result.plan).toBe('Focus on distributed systems.')
      expect(result.focusAreas).toHaveLength(2)
      expect(result.timeline).toBe('8-12 weeks')
    })
  })
})
