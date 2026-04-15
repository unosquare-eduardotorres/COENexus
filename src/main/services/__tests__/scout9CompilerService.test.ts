import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

vi.mock('../../db/agents/repositories/knowledgeRepository', () => ({
  knowledgeRepository: { getNoteById: vi.fn() },
}))

import { compileNote } from '../scout9CompilerService'
import { knowledgeRepository } from '../../db/agents/repositories/knowledgeRepository'

describe('compileNote', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should throw when note not found', () => {
    vi.mocked(knowledgeRepository.getNoteById).mockReturnValue(null)
    expect(() => compileNote('missing-id')).toThrow('Note missing-id not found')
  })

  it('should detect enrich mode for short notes under 100 words', () => {
    vi.mocked(knowledgeRepository.getNoteById).mockReturnValue({
      id: 'n1', note_title: 'Short Note', note_text: 'This is a short note with few words.',
    } as ReturnType<typeof knowledgeRepository.getNoteById>)

    const result = compileNote('n1')
    expect(result.mode).toBe('enrich')
    expect(result.compiledText).toBe('This is a short note with few words.')
    expect(result.tokenCount).toBeGreaterThan(0)
  })

  it('should detect shrink mode for long notes over 100 words', () => {
    const longText = Array(150).fill('word').join(' ')
    vi.mocked(knowledgeRepository.getNoteById).mockReturnValue({
      id: 'n2', note_title: 'Long Note', note_text: longText,
    } as ReturnType<typeof knowledgeRepository.getNoteById>)

    const result = compileNote('n2')
    expect(result.mode).toBe('shrink')
  })

  it('should use explicit mode when provided', () => {
    vi.mocked(knowledgeRepository.getNoteById).mockReturnValue({
      id: 'n3', note_title: 'Note', note_text: 'short text',
    } as ReturnType<typeof knowledgeRepository.getNoteById>)

    const result = compileNote('n3', 'shrink')
    expect(result.mode).toBe('shrink')
  })

  it('should calculate token count from compiled text', () => {
    vi.mocked(knowledgeRepository.getNoteById).mockReturnValue({
      id: 'n4', note_title: 'Token Note', note_text: 'hello world test',
    } as ReturnType<typeof knowledgeRepository.getNoteById>)

    const result = compileNote('n4')
    expect(result.tokenCount).toBe(Math.ceil(3 * 1.3))
  })
})
