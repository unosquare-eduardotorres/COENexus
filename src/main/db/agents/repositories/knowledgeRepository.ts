import { getAgentsDatabase } from '../agentsConnection'

export interface KnowledgeRuleRow {
  id: string
  rule_name: string
  rule_text: string
  priority: number
  is_active: number
  source: string
  created_at: string
  updated_at: string
}

export interface KnowledgeGlossaryRow {
  id: string
  term: string
  definition: string
  synonyms: string
  is_active: number
  created_at: string
  updated_at: string
}

export interface KnowledgeNoteRow {
  id: string
  note_title: string
  note_text: string
  tags_json: string
  is_active: number
  created_at: string
  updated_at: string
}

export interface ClientRuleOverrideRow {
  id: string
  client_id: string
  rule_id: string
  override_text: string
  is_active: number
  created_at: string
  updated_at: string
}

export interface CreateKnowledgeRuleInput {
  rule_name: string
  rule_text: string
  priority?: number
  is_active?: number
  source?: string
}

export interface UpdateKnowledgeRuleInput {
  rule_name?: string
  rule_text?: string
  priority?: number
  is_active?: number
  source?: string
}

export interface CreateKnowledgeGlossaryInput {
  term: string
  definition: string
  synonyms?: string
  is_active?: number
}

export interface UpdateKnowledgeGlossaryInput {
  term?: string
  definition?: string
  synonyms?: string
  is_active?: number
}

export interface CreateKnowledgeNoteInput {
  note_title: string
  note_text: string
  tags_json?: string
  is_active?: number
}

export interface UpdateKnowledgeNoteInput {
  note_title?: string
  note_text?: string
  tags_json?: string
  is_active?: number
}

export interface CreateClientRuleOverrideInput {
  client_id: string
  rule_id: string
  override_text: string
  is_active?: number
}

export interface UpdateClientRuleOverrideInput {
  override_text?: string
  is_active?: number
}

export const knowledgeRepository = {
  listRules(): KnowledgeRuleRow[] {
    const db = getAgentsDatabase()
    return db.prepare(`
      SELECT * FROM knowledge_rules
      ORDER BY priority ASC, updated_at DESC
    `).all() as KnowledgeRuleRow[]
  },

  getRuleById(id: string): KnowledgeRuleRow | undefined {
    const db = getAgentsDatabase()
    return db.prepare('SELECT * FROM knowledge_rules WHERE id = ?').get(id) as KnowledgeRuleRow | undefined
  },

  createRule(input: CreateKnowledgeRuleInput): KnowledgeRuleRow {
    const db = getAgentsDatabase()
    return db.prepare(`
      INSERT INTO knowledge_rules (
        rule_name, rule_text, priority, is_active, source, updated_at
      ) VALUES (
        @rule_name, @rule_text, @priority, @is_active, @source, datetime('now')
      )
      RETURNING *
    `).get({
      rule_name: input.rule_name,
      rule_text: input.rule_text,
      priority: input.priority ?? 100,
      is_active: input.is_active ?? 1,
      source: input.source ?? 'manual',
    }) as KnowledgeRuleRow
  },

  updateRule(id: string, input: UpdateKnowledgeRuleInput): boolean {
    const db = getAgentsDatabase()
    const updates: string[] = ['updated_at = datetime(\'now\')']
    const values: unknown[] = []

    for (const [key, value] of Object.entries(input)) {
      updates.push(`${key} = ?`)
      values.push(value)
    }

    values.push(id)
    const result = db.prepare(`
      UPDATE knowledge_rules
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...values)
    return result.changes > 0
  },

  deleteRule(id: string): boolean {
    const db = getAgentsDatabase()
    const result = db.prepare('DELETE FROM knowledge_rules WHERE id = ?').run(id)
    return result.changes > 0
  },

  listGlossary(): KnowledgeGlossaryRow[] {
    const db = getAgentsDatabase()
    return db.prepare(`
      SELECT * FROM knowledge_glossary
      ORDER BY term COLLATE NOCASE ASC
    `).all() as KnowledgeGlossaryRow[]
  },

  getGlossaryTermById(id: string): KnowledgeGlossaryRow | undefined {
    const db = getAgentsDatabase()
    return db.prepare('SELECT * FROM knowledge_glossary WHERE id = ?').get(id) as KnowledgeGlossaryRow | undefined
  },

  createGlossaryTerm(input: CreateKnowledgeGlossaryInput): KnowledgeGlossaryRow {
    const db = getAgentsDatabase()
    return db.prepare(`
      INSERT INTO knowledge_glossary (
        term, definition, synonyms, is_active, updated_at
      ) VALUES (
        @term, @definition, @synonyms, @is_active, datetime('now')
      )
      RETURNING *
    `).get({
      term: input.term,
      definition: input.definition,
      synonyms: input.synonyms ?? '',
      is_active: input.is_active ?? 1,
    }) as KnowledgeGlossaryRow
  },

  updateGlossaryTerm(id: string, input: UpdateKnowledgeGlossaryInput): boolean {
    const db = getAgentsDatabase()
    const updates: string[] = ['updated_at = datetime(\'now\')']
    const values: unknown[] = []

    for (const [key, value] of Object.entries(input)) {
      updates.push(`${key} = ?`)
      values.push(value)
    }

    values.push(id)
    const result = db.prepare(`
      UPDATE knowledge_glossary
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...values)
    return result.changes > 0
  },

  deleteGlossaryTerm(id: string): boolean {
    const db = getAgentsDatabase()
    const result = db.prepare('DELETE FROM knowledge_glossary WHERE id = ?').run(id)
    return result.changes > 0
  },

  listNotes(): KnowledgeNoteRow[] {
    const db = getAgentsDatabase()
    return db.prepare(`
      SELECT * FROM knowledge_notes
      ORDER BY updated_at DESC
    `).all() as KnowledgeNoteRow[]
  },

  getNoteById(id: string): KnowledgeNoteRow | undefined {
    const db = getAgentsDatabase()
    return db.prepare('SELECT * FROM knowledge_notes WHERE id = ?').get(id) as KnowledgeNoteRow | undefined
  },

  createNote(input: CreateKnowledgeNoteInput): KnowledgeNoteRow {
    const db = getAgentsDatabase()
    return db.prepare(`
      INSERT INTO knowledge_notes (
        note_title, note_text, tags_json, is_active, updated_at
      ) VALUES (
        @note_title, @note_text, @tags_json, @is_active, datetime('now')
      )
      RETURNING *
    `).get({
      note_title: input.note_title,
      note_text: input.note_text,
      tags_json: input.tags_json ?? '[]',
      is_active: input.is_active ?? 1,
    }) as KnowledgeNoteRow
  },

  updateNote(id: string, input: UpdateKnowledgeNoteInput): boolean {
    const db = getAgentsDatabase()
    const updates: string[] = ['updated_at = datetime(\'now\')']
    const values: unknown[] = []

    for (const [key, value] of Object.entries(input)) {
      updates.push(`${key} = ?`)
      values.push(value)
    }

    values.push(id)
    const result = db.prepare(`
      UPDATE knowledge_notes
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...values)
    return result.changes > 0
  },

  deleteNote(id: string): boolean {
    const db = getAgentsDatabase()
    const result = db.prepare('DELETE FROM knowledge_notes WHERE id = ?').run(id)
    return result.changes > 0
  },

  listOverrides(clientId?: string): ClientRuleOverrideRow[] {
    const db = getAgentsDatabase()
    if (clientId) {
      return db.prepare(`
        SELECT * FROM client_rule_overrides
        WHERE client_id = ?
        ORDER BY updated_at DESC
      `).all(clientId) as ClientRuleOverrideRow[]
    }

    return db.prepare(`
      SELECT * FROM client_rule_overrides
      ORDER BY updated_at DESC
    `).all() as ClientRuleOverrideRow[]
  },

  getOverrideById(id: string): ClientRuleOverrideRow | undefined {
    const db = getAgentsDatabase()
    return db.prepare('SELECT * FROM client_rule_overrides WHERE id = ?').get(id) as ClientRuleOverrideRow | undefined
  },

  createOverride(input: CreateClientRuleOverrideInput): ClientRuleOverrideRow {
    const db = getAgentsDatabase()
    return db.prepare(`
      INSERT INTO client_rule_overrides (
        client_id, rule_id, override_text, is_active, updated_at
      ) VALUES (
        @client_id, @rule_id, @override_text, @is_active, datetime('now')
      )
      ON CONFLICT(client_id, rule_id) DO UPDATE SET
        override_text = excluded.override_text,
        is_active = excluded.is_active,
        updated_at = datetime('now')
      RETURNING *
    `).get({
      client_id: input.client_id,
      rule_id: input.rule_id,
      override_text: input.override_text,
      is_active: input.is_active ?? 1,
    }) as ClientRuleOverrideRow
  },

  updateOverride(id: string, input: UpdateClientRuleOverrideInput): boolean {
    const db = getAgentsDatabase()
    const updates: string[] = ['updated_at = datetime(\'now\')']
    const values: unknown[] = []

    for (const [key, value] of Object.entries(input)) {
      updates.push(`${key} = ?`)
      values.push(value)
    }

    values.push(id)
    const result = db.prepare(`
      UPDATE client_rule_overrides
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...values)
    return result.changes > 0
  },

  deleteOverride(id: string): boolean {
    const db = getAgentsDatabase()
    const result = db.prepare('DELETE FROM client_rule_overrides WHERE id = ?').run(id)
    return result.changes > 0
  },
}
