import { describe, expect, it } from 'vitest'
import { countKnowledgeTokens } from '../tokenCountService'

describe('countKnowledgeTokens', () => {
  it('should return 0 for empty string', () => {
    expect(countKnowledgeTokens('')).toBe(0)
  })

  it('should return 0 for null/undefined-like empty', () => {
    expect(countKnowledgeTokens('')).toBe(0)
  })

  it('should count tokens as words times 1.3 rounded up', () => {
    const result = countKnowledgeTokens('hello world')
    expect(result).toBe(Math.ceil(2 * 1.3))
  })

  it('should handle multiple spaces and newlines', () => {
    const result = countKnowledgeTokens('one   two\n\nthree')
    expect(result).toBe(Math.ceil(3 * 1.3))
  })

  it('should handle single word', () => {
    expect(countKnowledgeTokens('hello')).toBe(Math.ceil(1 * 1.3))
  })

  it('should handle whitespace-only string', () => {
    expect(countKnowledgeTokens('   \n\t  ')).toBe(0)
  })
})
