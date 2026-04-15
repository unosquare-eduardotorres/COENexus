import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { StructuredResume } from '../types'

function makeResume(overrides: Partial<StructuredResume> = {}): StructuredResume {
  return {
    id: '1',
    originalFileName: 'test.pdf',
    originalFileType: 'pdf',
    originalContent: '',
    candidateName: 'Jane Developer',
    email: 'jane@example.com',
    phone: '+1 555-0100',
    summary: 'Experienced software engineer.',
    experience: [
      {
        id: 'exp-1',
        company: 'Tech Co',
        title: 'Senior Engineer',
        startDate: '2020-01',
        endDate: 'Present',
        description: 'Built scalable systems.',
        achievements: ['Improved performance by 50%'],
        technologies: ['React', 'Node.js'],
      },
    ],
    education: [
      {
        id: 'edu-1',
        institution: 'MIT',
        degree: 'BS',
        field: 'Computer Science',
        graduationDate: '2018',
      },
    ],
    skills: [
      { id: 'sk-1', name: 'Frontend', skills: ['React', 'TypeScript'] },
    ],
    certifications: [
      { id: 'cert-1', name: 'AWS Certified', issuer: 'Amazon', date: '2023-06' },
    ],
    transformedAt: new Date().toISOString(),
    status: 'transformed',
    validationResults: [],
    overallValidationStatus: 'valid',
    ...overrides,
  }
}

describe('pdfExportService', () => {
  let mockWindow: { document: { write: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> }; onload: (() => void) | null; print: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    mockWindow = {
      document: { write: vi.fn(), close: vi.fn() },
      onload: null,
      print: vi.fn(),
    }
    vi.spyOn(window, 'open').mockReturnValue(mockWindow as any)
  })

  describe('downloadPdf', () => {
    it('should open a new window and write HTML', async () => {
      const { pdfExportService } = await import('./pdfExportService')
      const resume = makeResume()

      await pdfExportService.downloadPdf(resume)

      expect(window.open).toHaveBeenCalledWith('', '_blank')
      expect(mockWindow.document.write).toHaveBeenCalledOnce()
      expect(mockWindow.document.close).toHaveBeenCalledOnce()
    })

    it('should include candidate name in HTML', async () => {
      const { pdfExportService } = await import('./pdfExportService')
      const resume = makeResume({ candidateName: 'John Doe' })

      await pdfExportService.downloadPdf(resume)

      const html = mockWindow.document.write.mock.calls[0][0] as string
      expect(html).toContain('John Doe')
    })

    it('should include experience section in HTML', async () => {
      const { pdfExportService } = await import('./pdfExportService')
      const resume = makeResume()

      await pdfExportService.downloadPdf(resume)

      const html = mockWindow.document.write.mock.calls[0][0] as string
      expect(html).toContain('Professional Experience')
      expect(html).toContain('Tech Co')
      expect(html).toContain('Senior Engineer')
    })

    it('should include education section in HTML', async () => {
      const { pdfExportService } = await import('./pdfExportService')
      const resume = makeResume()

      await pdfExportService.downloadPdf(resume)

      const html = mockWindow.document.write.mock.calls[0][0] as string
      expect(html).toContain('Education')
      expect(html).toContain('MIT')
      expect(html).toContain('Computer Science')
    })

    it('should include skills section in HTML', async () => {
      const { pdfExportService } = await import('./pdfExportService')
      const resume = makeResume()

      await pdfExportService.downloadPdf(resume)

      const html = mockWindow.document.write.mock.calls[0][0] as string
      expect(html).toContain('Skills')
      expect(html).toContain('React')
      expect(html).toContain('TypeScript')
    })

    it('should include certifications in HTML', async () => {
      const { pdfExportService } = await import('./pdfExportService')
      const resume = makeResume()

      await pdfExportService.downloadPdf(resume)

      const html = mockWindow.document.write.mock.calls[0][0] as string
      expect(html).toContain('Certifications')
      expect(html).toContain('AWS Certified')
    })

    it('should escape HTML special characters', async () => {
      const { pdfExportService } = await import('./pdfExportService')
      const resume = makeResume({ candidateName: '<script>alert("xss")</script>' })

      await pdfExportService.downloadPdf(resume)

      const html = mockWindow.document.write.mock.calls[0][0] as string
      expect(html).not.toContain('<script>')
      expect(html).toContain('&lt;script&gt;')
    })

    it('should handle resume with no experience', async () => {
      const { pdfExportService } = await import('./pdfExportService')
      const resume = makeResume({ experience: [] })

      await pdfExportService.downloadPdf(resume)

      const html = mockWindow.document.write.mock.calls[0][0] as string
      expect(html).not.toContain('Professional Experience')
    })

    it('should handle resume with no summary', async () => {
      const { pdfExportService } = await import('./pdfExportService')
      const resume = makeResume({ summary: '' })

      await pdfExportService.downloadPdf(resume)

      const html = mockWindow.document.write.mock.calls[0][0] as string
      expect(html).not.toContain('Professional Summary')
    })

    it('should handle window.open returning null', async () => {
      vi.spyOn(window, 'open').mockReturnValue(null)
      const { pdfExportService } = await import('./pdfExportService')
      const resume = makeResume()

      await expect(pdfExportService.downloadPdf(resume)).resolves.not.toThrow()
    })
  })
})
