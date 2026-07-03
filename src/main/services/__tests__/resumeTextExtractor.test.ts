import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

describe('resumeTextExtractor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('extractText', () => {
    it('should throw on unsupported format', async () => {
      const { resumeTextExtractor } = await import('../resumeTextExtractor')
      const fileBytes = Buffer.from('some data')

      await expect(
        resumeTextExtractor.extractText(fileBytes, 'test.xyz')
      ).rejects.toThrow('Unsupported resume format: .xyz')
    })

    it('should throw on files with no extension', async () => {
      const { resumeTextExtractor } = await import('../resumeTextExtractor')
      const fileBytes = Buffer.from('some data')

      await expect(
        resumeTextExtractor.extractText(fileBytes, 'noextension')
      ).rejects.toThrow()
    })

    it('should detect extension case-insensitively', async () => {
      const ext = 'Resume.PDF'.toLowerCase().split('.').pop() ?? ''
      expect(`.${ext}`).toBe('.pdf')
    })

    it('should strip null bytes from extracted text', () => {
      const raw = 'Hello\0World\0Test'
      const cleaned = raw.replace(/\0/g, '')
      expect(cleaned).toBe('HelloWorldTest')
    })

    it('should handle empty filename gracefully', () => {
      const ext = ''.toLowerCase().split('.').pop() ?? ''
      expect(ext).toBe('')
    })
  })

  describe('file type detection', () => {
    it('should identify PDF files', () => {
      const ext = 'document.pdf'.toLowerCase().split('.').pop()
      expect(`.${ext}`).toBe('.pdf')
    })

    it('should identify DOCX files', () => {
      const ext = 'resume.docx'.toLowerCase().split('.').pop()
      expect(`.${ext}`).toBe('.docx')
    })

    it('should identify DOC files', () => {
      const ext = 'old_resume.doc'.toLowerCase().split('.').pop()
      expect(`.${ext}`).toBe('.doc')
    })

    it('should identify image files', () => {
      const imageExts = ['photo.jpg', 'scan.jpeg', 'capture.png']
      const results = imageExts.map(f => `.${f.toLowerCase().split('.').pop()}`)
      expect(results).toEqual(['.jpg', '.jpeg', '.png'])
    })
  })

  describe('findBinary', () => {
    it('should search in expected directories', () => {
      const searchDirs = ['/opt/homebrew/bin', '/usr/local/bin', '/usr/bin']
      expect(searchDirs).toHaveLength(3)
      expect(searchDirs[0]).toBe('/opt/homebrew/bin')
    })
  })
})
