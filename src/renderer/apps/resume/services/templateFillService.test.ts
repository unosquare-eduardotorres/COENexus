import { describe, it, expect, vi, beforeEach } from 'vitest'
import { templateFillService } from './templateFillService'

describe('templateFillService', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('getTemplateBuffer', () => {
    it('should call app.readBundledFile', async () => {
      const fakeArrayBuffer = new ArrayBuffer(10)
      vi.mocked(window.api.app.readBundledFile).mockResolvedValue(
        Buffer.from(fakeArrayBuffer).toString('base64')
      )
      try {
        await templateFillService.getTemplateBuffer()
      } catch {
        // may fail on docx parsing, but IPC call should have been made
      }
      expect(window.api.app.readBundledFile).toHaveBeenCalled()
    })
  })
})
