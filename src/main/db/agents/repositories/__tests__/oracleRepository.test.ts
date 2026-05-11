import { describe, expect, it, vi, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { createAgentsDb } from '../../../../../../tests/_helpers/mockDb'

let db: Database.Database

vi.mock('../../agentsConnection', () => ({
  getAgentsDatabase: () => db,
}))

import { oracleRepository } from '../oracleRepository'

describe('oracleRepository', () => {
  beforeEach(() => {
    db = createAgentsDb()
  })

  it('should createChatMessage and return row with id', () => {
    const msg = oracleRepository.createChatMessage({
      role: 'user',
      content: 'Hello Oracle',
    })

    expect(msg.id).toBeDefined()
    expect(msg.role).toBe('user')
    expect(msg.content).toBe('Hello Oracle')
    expect(msg.created_at).toBeDefined()
  })

  it('should listChatMessages ordered by created_at DESC', () => {
    oracleRepository.createChatMessage({ role: 'user', content: 'First', created_at: '2026-01-01T00:00:00Z' })
    oracleRepository.createChatMessage({ role: 'assistant', content: 'Second', created_at: '2026-01-02T00:00:00Z' })

    const messages = oracleRepository.listChatMessages()
    expect(messages).toHaveLength(2)
    expect(messages[0].content).toBe('Second')
  })

  it('should clearChatMessages and return count', () => {
    oracleRepository.createChatMessage({ role: 'user', content: 'msg1' })
    oracleRepository.createChatMessage({ role: 'assistant', content: 'msg2' })

    const deleted = oracleRepository.clearChatMessages()
    expect(deleted).toBe(2)

    const remaining = oracleRepository.listChatMessages()
    expect(remaining).toHaveLength(0)
  })
})
