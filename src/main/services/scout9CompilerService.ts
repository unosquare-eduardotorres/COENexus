import { knowledgeRepository } from '../db/agents/repositories/knowledgeRepository'
import { countKnowledgeTokens } from './tokenCountService'
import { createLogger } from './logger'

const log = createLogger('Scout9Compiler')

interface CompileResult {
  mode: 'enrich' | 'shrink'
  compiledText: string
  questions?: string[]
  tokenCount: number
}

export function compileNote(noteId: string, mode?: 'enrich' | 'shrink'): CompileResult {
  const note = knowledgeRepository.getNoteById(noteId)
  if (!note) {
    throw new Error(`Note ${noteId} not found`)
  }

  const wordCount = note.note_text.split(/\s+/).filter(Boolean).length
  const detectedMode = mode ?? (wordCount < 100 ? 'enrich' : 'shrink')

  let compiledText: string
  if (detectedMode === 'enrich') {
    compiledText = note.note_text
  } else {
    compiledText = note.note_text
  }

  const tokenCount = countKnowledgeTokens(compiledText)

  log.info('Note compiled', { noteId, mode: detectedMode, wordCount, tokenCount })

  return {
    mode: detectedMode,
    compiledText,
    tokenCount,
  }
}
