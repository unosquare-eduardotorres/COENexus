import { describe, it, expect } from 'vitest'
import { parseAiResponse } from './aiResponseParser'
import { haikuTriageSchema, opusAnalysisSchema } from './aiResponseSchemas'

describe('aiResponseParser (Zod 4 migration telemetry)', () => {
  it('should parse valid haiku triage JSON', () => {
    const raw = '{"relevant": true, "score": 85, "reason": "Strong match"}'
    const result = parseAiResponse(raw, haikuTriageSchema, 'haiku')
    expect(result.relevant).toBe(true)
    expect(result.score).toBe(85)
  })

  it('should parse haiku response wrapped in markdown code block', () => {
    const raw = '```json\n{"relevant": false, "score": 20, "reason": "No match"}\n```'
    const result = parseAiResponse(raw, haikuTriageSchema, 'haiku')
    expect(result.relevant).toBe(false)
  })

  it('should apply defaults for missing haiku fields', () => {
    const raw = '{}'
    const result = parseAiResponse(raw, haikuTriageSchema, 'haiku')
    expect(result.relevant).toBe(false)
    expect(result.score).toBe(0)
    expect(result.reason).toBe('')
  })

  it('should apply defaults for missing opus fields', () => {
    const raw = '{}'
    const result = parseAiResponse(raw, opusAnalysisSchema, 'opus')
    expect(result.matchScore).toBe(0)
    expect(result.skills).toEqual([])
  })

  it('should throw on completely invalid JSON', () => {
    expect(() => parseAiResponse('not json', haikuTriageSchema, 'haiku'))
      .toThrow()
  })
})
