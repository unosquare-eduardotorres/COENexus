import { describe, expect, it } from 'vitest'
import {
  validateJwtStructure,
  decodeTokenPayload,
  getTokenExpiration,
  isTokenExpired,
  formatCountdown,
} from './tokenUtils'

const fakePayload = { sub: 'user-1', email: 'test@test.com', exp: Math.floor(Date.now() / 1000) + 3600 }
const fakeToken = [
  btoa(JSON.stringify({ alg: 'HS256' })),
  btoa(JSON.stringify(fakePayload)),
  'signature',
].join('.')

describe('validateJwtStructure', () => {
  it('should return true for valid three-part token', () => {
    expect(validateJwtStructure(fakeToken)).toBe(true)
  })

  it('should return false for empty string', () => {
    expect(validateJwtStructure('')).toBe(false)
  })

  it('should return false for two-part token', () => {
    expect(validateJwtStructure('a.b')).toBe(false)
  })
})

describe('decodeTokenPayload', () => {
  it('should decode payload from valid token', () => {
    const payload = decodeTokenPayload(fakeToken)
    expect(payload?.sub).toBe('user-1')
    expect(payload?.email).toBe('test@test.com')
  })

  it('should return null for invalid token', () => {
    expect(decodeTokenPayload('invalid')).toBeNull()
  })

  it('should return null for malformed base64', () => {
    expect(decodeTokenPayload('a.!!!.c')).toBeNull()
  })
})

describe('getTokenExpiration', () => {
  it('should return Date from exp claim', () => {
    const exp = getTokenExpiration(fakeToken)
    expect(exp).toBeInstanceOf(Date)
    expect(exp!.getTime()).toBe(fakePayload.exp * 1000)
  })

  it('should return null for token without exp', () => {
    const noExp = [btoa('{}'), btoa('{"sub":"x"}'), 'sig'].join('.')
    expect(getTokenExpiration(noExp)).toBeNull()
  })
})

describe('isTokenExpired', () => {
  it('should return false for future expiration', () => {
    expect(isTokenExpired(fakeToken)).toBe(false)
  })

  it('should return true for past expiration', () => {
    const expired = [
      btoa('{}'),
      btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 3600 })),
      'sig',
    ].join('.')
    expect(isTokenExpired(expired)).toBe(true)
  })

  it('should return true for invalid token', () => {
    expect(isTokenExpired('bad')).toBe(true)
  })
})

describe('formatCountdown', () => {
  it('should format zero as 00:00:00', () => {
    expect(formatCountdown(0)).toBe('00:00:00')
  })

  it('should format negative as 00:00:00', () => {
    expect(formatCountdown(-1000)).toBe('00:00:00')
  })

  it('should format 1 hour 30 minutes 15 seconds', () => {
    const ms = (1 * 3600 + 30 * 60 + 15) * 1000
    expect(formatCountdown(ms)).toBe('01:30:15')
  })

  it('should format seconds only', () => {
    expect(formatCountdown(5000)).toBe('00:00:05')
  })
})
