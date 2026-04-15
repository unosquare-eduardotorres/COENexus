import { describe, it, expect, vi, beforeEach } from 'vitest'
import { trackPathEvent } from './pathAnalytics'

describe('trackPathEvent', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('should call path.saveAnalyticsEvent when available', () => {
    vi.mocked(window.api.path.saveAnalyticsEvent).mockResolvedValue({ success: true })
    trackPathEvent('dashboard_viewed', { page: '/home' })
    expect(window.api.path.saveAnalyticsEvent).toHaveBeenCalledWith({
      eventName: 'dashboard_viewed',
      payload: { page: '/home' },
    })
  })

  it('should not throw when analytics call fails', () => {
    vi.mocked(window.api.path.saveAnalyticsEvent).mockRejectedValue(new Error('fail'))
    expect(() => trackPathEvent('module_started')).not.toThrow()
  })

  it('should use empty object as default payload', () => {
    vi.mocked(window.api.path.saveAnalyticsEvent).mockResolvedValue({ success: true })
    trackPathEvent('settings_saved')
    expect(window.api.path.saveAnalyticsEvent).toHaveBeenCalledWith({
      eventName: 'settings_saved',
      payload: {},
    })
  })
})
