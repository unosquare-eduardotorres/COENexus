import { describe, expect, it } from 'vitest'
import { safeJsonParse } from './safeJsonParse'

describe('safeJsonParse', () => {
  it('should parse valid JSON', () => {
    expect(safeJsonParse('{"a":1}', {})).toEqual({ a: 1 })
  })

  it('should return fallback for invalid JSON', () => {
    expect(safeJsonParse('not json', 42)).toBe(42)
  })

  it('should return fallback for null', () => {
    expect(safeJsonParse(null, 'default')).toBe('default')
  })

  it('should return fallback for empty string', () => {
    expect(safeJsonParse('', [])).toEqual([])
  })

  it('should parse arrays', () => {
    expect(safeJsonParse('[1,2,3]', [])).toEqual([1, 2, 3])
  })

  it('should parse string values', () => {
    expect(safeJsonParse('"hello"', '')).toBe('hello')
  })
})
