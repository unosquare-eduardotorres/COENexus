import { describe, it, expect, vi, beforeEach } from 'vitest'
import { batchService } from './batchService'

describe('batchService (renderer)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('processFiles', () => {
    it('should process empty file list and return empty results', async () => {
      const onProgress = vi.fn()
      const result = await batchService.processFiles([], {} as any, onProgress)
      expect(result).toEqual([])
    })
  })
})
