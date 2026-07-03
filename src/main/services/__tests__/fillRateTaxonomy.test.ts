import { describe, it, expect } from 'vitest'
import {
  fillRateGoalFor,
  FILL_RATE_DEFAULT_GOAL,
  FILL_RATE_ELEVATED_GOAL,
} from '../../../shared/fillRateTaxonomy'

describe('fillRateTaxonomy', () => {
  describe('constants', () => {
    it('default goal is 60', () => {
      expect(FILL_RATE_DEFAULT_GOAL).toBe(60)
    })

    it('elevated goal is 70', () => {
      expect(FILL_RATE_ELEVATED_GOAL).toBe(70)
    })
  })

  describe('fillRateGoalFor', () => {
    it('returns 70 for Quality Engineering', () => {
      expect(fillRateGoalFor('Quality Engineering')).toBe(70)
    })

    it('returns 70 for Quality Assurance', () => {
      expect(fillRateGoalFor('Quality Assurance')).toBe(70)
    })

    it('returns 60 for Software Engineering', () => {
      expect(fillRateGoalFor('Software Engineering')).toBe(60)
    })

    it('returns 60 for Data', () => {
      expect(fillRateGoalFor('Data')).toBe(60)
    })

    it('returns 60 for empty string', () => {
      expect(fillRateGoalFor('')).toBe(60)
    })

    it('returns 60 for Unassigned', () => {
      expect(fillRateGoalFor('Unassigned')).toBe(60)
    })

    it('is case-sensitive — lowercase does not match', () => {
      expect(fillRateGoalFor('quality engineering')).toBe(60)
    })
  })
})
