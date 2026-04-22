import { getAgentsDatabase } from '../agentsConnection'

export type OracleChatRole = 'user' | 'assistant'

export interface OracleChatMessageRow {
  id: string
  role: OracleChatRole
  content: string
  metadata_json: string | null
  created_at: string
}

export interface CreateOracleChatMessageInput {
  role: OracleChatRole
  content: string
  metadata_json?: string | null
  created_at?: string
}

export interface ListOracleChatMessagesInput {
  limit?: number
  offset?: number
}

export const oracleRepository = {
  createChatMessage(input: CreateOracleChatMessageInput): OracleChatMessageRow {
    const db = getAgentsDatabase()
    const row = db.prepare(`
      INSERT INTO oracle_chat_messages (
        role, content, metadata_json, created_at
      ) VALUES (
        @role, @content, @metadata_json, @created_at
      )
      RETURNING *
    `).get({
      role: input.role,
      content: input.content,
      metadata_json: input.metadata_json ?? null,
      created_at: input.created_at ?? new Date().toISOString(),
    }) as OracleChatMessageRow | undefined

    if (!row) throw new Error('Failed to create oracle chat message')
    return row
  },

  listChatMessages(input: ListOracleChatMessagesInput = {}): OracleChatMessageRow[] {
    const db = getAgentsDatabase()
    const limit = input.limit ?? 100
    const offset = input.offset ?? 0
    return db.prepare(`
      SELECT * FROM oracle_chat_messages
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset) as OracleChatMessageRow[]
  },

  clearChatMessages(): number {
    const db = getAgentsDatabase()
    const result = db.prepare('DELETE FROM oracle_chat_messages').run()
    return result.changes
  },
}
