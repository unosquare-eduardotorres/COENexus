import { describe, it, expect, vi, beforeEach } from 'vitest'
import { reportError } from './reportError'

describe('reportError', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      api: { bug: { report: vi.fn() } },
      location: { hash: '#/agents' },
    })
  })

  it('should return the error message from an Error instance', () => {
    expect(reportError(new Error('test failure'))).toBe('test failure')
  })

  it('should return stringified message for non-Error values', () => {
    expect(reportError('something broke')).toBe('something broke')
  })

  it('should call window.api.bug.report with correct params', () => {
    const err = new Error('fail')
    reportError(err, 'IPC')
    expect(window.api.bug.report).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'fail', scope: 'IPC' })
    )
  })

  it('should not throw when window.api is undefined', () => {
    vi.stubGlobal('window', { location: { hash: '' } })
    expect(() => reportError(new Error('safe'))).not.toThrow()
  })
})
