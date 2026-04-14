import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('fileExtractionService (pdfjs-dist v5 telemetry)', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('should configure pdfjs worker without throwing', async () => {
    await expect(import('./fileExtractionService')).resolves.toBeDefined()
  })

  it('should export extractText via fileExtractionService', async () => {
    const mod = await import('./fileExtractionService')
    expect(typeof mod.fileExtractionService.extractText).toBe('function')
  })
})
