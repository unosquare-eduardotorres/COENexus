import { describe, expect, it, vi, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { createAgentsDb } from '../../../../../../tests/_helpers/mockDb'

let db: Database.Database

vi.mock('../../agentsConnection', () => ({
  getAgentsDatabase: () => db,
}))

import { knowledgeRepository } from '../knowledgeRepository'

describe('knowledgeRepository', () => {
  beforeEach(() => {
    db = createAgentsDb()
  })

  describe('rules', () => {
    it('should createRule and return row', () => {
      const rule = knowledgeRepository.createRule({
        rule_name: 'Rate Cap',
        rule_text: 'Max rate is 120 USD/hr',
        priority: 10,
      })

      expect(rule.id).toBeDefined()
      expect(rule.rule_name).toBe('Rate Cap')
      expect(rule.priority).toBe(10)
      expect(rule.is_active).toBe(1)
    })

    it('should listRules ordered by priority ASC', () => {
      knowledgeRepository.createRule({ rule_name: 'Low Priority', rule_text: 't', priority: 50 })
      knowledgeRepository.createRule({ rule_name: 'High Priority', rule_text: 't', priority: 1 })

      const rules = knowledgeRepository.listRules()
      expect(rules[0].rule_name).toBe('High Priority')
    })
  })

  describe('glossary', () => {
    it('should createGlossaryTerm and return row', () => {
      const term = knowledgeRepository.createGlossaryTerm({
        term: 'COE',
        definition: 'Center of Excellence',
        synonyms: 'centre of excellence',
      })

      expect(term.id).toBeDefined()
      expect(term.term).toBe('COE')
      expect(term.definition).toBe('Center of Excellence')
    })
  })

  describe('notes', () => {
    it('should createNote and return row', () => {
      const note = knowledgeRepository.createNote({
        note_title: 'Best Practices',
        note_text: 'Always verify token before sync',
        tags_json: '["sync","security"]',
      })

      expect(note.id).toBeDefined()
      expect(note.note_title).toBe('Best Practices')
      expect(note.tags_json).toBe('["sync","security"]')
    })
  })

  describe('overrides', () => {
    it('should listOverrides (empty initially)', () => {
      const overrides = knowledgeRepository.listOverrides()
      expect(Array.isArray(overrides)).toBe(true)
    })

    it('should createOverride and list by client', () => {
      const rule = knowledgeRepository.createRule({ rule_name: 'R', rule_text: 'text' })
      const override = knowledgeRepository.createOverride({
        client_id: 'client-1',
        rule_id: rule.id,
        override_text: 'Custom override for client',
      })

      expect(override.id).toBeDefined()
      expect(override.client_id).toBe('client-1')

      const byClient = knowledgeRepository.listOverrides('client-1')
      expect(byClient).toHaveLength(1)
    })
  })
})
