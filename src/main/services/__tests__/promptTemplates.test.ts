import { describe, expect, it } from 'vitest'
import {
  fillTemplate,
  OPUS_ANALYSIS,
  MATCH_ENGINE_CONTEXT_BLOCK,
  BENCH_BURN_CONTEXT_BLOCK,
  PRESENTATION_INTRO,
} from '../promptTemplates'

describe('promptTemplates', () => {
  describe('fillTemplate', () => {
    it('should replace all {{key}} placeholders', () => {
      const template = 'Hello {{name}}, you are {{role}}.'
      const result = fillTemplate(template, { name: 'Alice', role: 'admin' })

      expect(result).toBe('Hello Alice, you are admin.')
    })

    it('should replace multiple occurrences of the same key', () => {
      const template = '{{name}} and {{name}} again'
      const result = fillTemplate(template, { name: 'Bob' })

      expect(result).toBe('Bob and Bob again')
    })

    it('should leave unmatched {{key}} placeholders untouched', () => {
      const template = 'Hello {{name}}, your {{missing}} value.'
      const result = fillTemplate(template, { name: 'Charlie' })

      expect(result).toBe('Hello Charlie, your {{missing}} value.')
    })

    it('should handle empty replacements object', () => {
      const template = 'No {{changes}} here.'
      const result = fillTemplate(template, {})

      expect(result).toBe('No {{changes}} here.')
    })
  })

  describe('OPUS_ANALYSIS', () => {
    it('should contain required JSON schema fields', () => {
      expect(OPUS_ANALYSIS).toContain('matchScore')
      expect(OPUS_ANALYSIS).toContain('fitVerdict')
      expect(OPUS_ANALYSIS).toContain('"skills"')
      expect(OPUS_ANALYSIS).toContain('"gaps"')
      expect(OPUS_ANALYSIS).toContain('{{contextBlock}}')
      expect(OPUS_ANALYSIS).toContain('{{resume}}')
      expect(OPUS_ANALYSIS).toContain('{{country}}')
      expect(OPUS_ANALYSIS).toContain('{{salaryDisplay}}')
    })
  })

  describe('MATCH_ENGINE_CONTEXT_BLOCK', () => {
    it('should contain all expected placeholders', () => {
      expect(MATCH_ENGINE_CONTEXT_BLOCK).toContain('{{jobDescription}}')
      expect(MATCH_ENGINE_CONTEXT_BLOCK).toContain('{{candidateName}}')
      expect(MATCH_ENGINE_CONTEXT_BLOCK).toContain('{{jobTitle}}')
      expect(MATCH_ENGINE_CONTEXT_BLOCK).toContain('{{seniority}}')
      expect(MATCH_ENGINE_CONTEXT_BLOCK).toContain('{{mainSkill}}')
      expect(MATCH_ENGINE_CONTEXT_BLOCK).toContain('{{country}}')
      expect(MATCH_ENGINE_CONTEXT_BLOCK).toContain('{{rate}}')
      expect(MATCH_ENGINE_CONTEXT_BLOCK).toContain('{{currency}}')
      expect(MATCH_ENGINE_CONTEXT_BLOCK).toContain('{{isBench}}')
      expect(MATCH_ENGINE_CONTEXT_BLOCK).toContain('{{sourceType}}')
    })
  })

  describe('BENCH_BURN_CONTEXT_BLOCK', () => {
    it('should contain position and employee placeholders', () => {
      expect(BENCH_BURN_CONTEXT_BLOCK).toContain('{{account}}')
      expect(BENCH_BURN_CONTEXT_BLOCK).toContain('{{jobTitle}}')
      expect(BENCH_BURN_CONTEXT_BLOCK).toContain('{{positionMainSkill}}')
      expect(BENCH_BURN_CONTEXT_BLOCK).toContain('{{jobDescription}}')
      expect(BENCH_BURN_CONTEXT_BLOCK).toContain('{{employeeName}}')
      expect(BENCH_BURN_CONTEXT_BLOCK).toContain('{{employeeJobTitle}}')
      expect(BENCH_BURN_CONTEXT_BLOCK).toContain('{{seniority}}')
      expect(BENCH_BURN_CONTEXT_BLOCK).toContain('{{employeeMainSkill}}')
      expect(BENCH_BURN_CONTEXT_BLOCK).toContain('{{country}}')
    })
  })

  describe('PRESENTATION_INTRO', () => {
    it('should contain candidateNames, positionTitle, accountName placeholders', () => {
      expect(PRESENTATION_INTRO).toContain('{{candidateNames}}')
      expect(PRESENTATION_INTRO).toContain('{{positionTitle}}')
      expect(PRESENTATION_INTRO).toContain('{{accountName}}')
      expect(PRESENTATION_INTRO).toContain('{{mainSkill}}')
      expect(PRESENTATION_INTRO).toContain('{{jobDescription}}')
    })
  })
})
