import { describe, expect, it, vi, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { createAgentsDb } from '../../../../../../tests/_helpers/mockDb'

let db: Database.Database

vi.mock('../../agentsConnection', () => ({
  getAgentsDatabase: () => db,
}))

import { patternRepository } from '../patternRepository'

describe('patternRepository', () => {
  beforeEach(() => {
    db = createAgentsDb()
  })

  it('should createPattern and return row', () => {
    const pattern = patternRepository.createPattern({
      pattern_name: 'Rate Preference',
      pattern_text: 'Stakeholder prefers rates under 80 USD',
      confidence_score: 0.85,
    })

    expect(pattern.id).toBeDefined()
    expect(pattern.pattern_name).toBe('Rate Preference')
    expect(pattern.confidence_score).toBe(0.85)
    expect(pattern.usage_count).toBe(0)
  })

  it('should listPatterns ordered by confidence_score DESC', () => {
    patternRepository.createPattern({ pattern_name: 'Low', pattern_text: 'low', confidence_score: 0.3 })
    patternRepository.createPattern({ pattern_name: 'High', pattern_text: 'high', confidence_score: 0.9 })

    const patterns = patternRepository.listPatterns()
    expect(patterns.length).toBeGreaterThanOrEqual(2)
    expect(patterns[0].pattern_name).toBe('High')
  })

  it('should updatePattern fields', () => {
    const pattern = patternRepository.createPattern({ pattern_name: 'Old', pattern_text: 'text' })
    const updated = patternRepository.updatePattern(pattern.id, { pattern_name: 'New', confidence_score: 0.99 })

    expect(updated).toBe(true)
    const fetched = patternRepository.getPatternById(pattern.id)
    expect(fetched!.pattern_name).toBe('New')
    expect(fetched!.confidence_score).toBe(0.99)
  })

  it('should incrementUsage', () => {
    const pattern = patternRepository.createPattern({ pattern_name: 'P', pattern_text: 't' })
    expect(pattern.usage_count).toBe(0)

    patternRepository.incrementUsage(pattern.id)
    patternRepository.incrementUsage(pattern.id)

    const fetched = patternRepository.getPatternById(pattern.id)
    expect(fetched!.usage_count).toBe(2)
  })

  it('should createApplication linked to pattern', () => {
    const pattern = patternRepository.createPattern({ pattern_name: 'P', pattern_text: 't' })
    const app = patternRepository.createApplication({
      pattern_id: pattern.id,
      details: 'Applied in report',
    })

    expect(app.id).toBeDefined()
    expect(app.pattern_id).toBe(pattern.id)

    const apps = patternRepository.listApplicationsByPattern(pattern.id)
    expect(apps).toHaveLength(1)
  })

  it('should createSkipFeedback', () => {
    const feedback = patternRepository.createSkipFeedback({
      candidate_id: 'cand-1',
      reason: 'Over budget',
      notes: 'Rate was too high',
    })

    expect(feedback.id).toBeDefined()
    expect(feedback.reason).toBe('Over budget')

    const list = patternRepository.listSkipFeedbackByCandidate('cand-1')
    expect(list).toHaveLength(1)
  })
})
