import Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SCHEMA } from './testSchema'
import { catalogRepository } from '../catalogRepository'

let testDb: Database.Database

vi.mock('../../connection', () => ({
  getDatabase: () => testDb,
}))

describe('catalogRepository', () => {
  beforeEach(() => {
    testDb = new Database(':memory:')
    testDb.pragma('foreign_keys = ON')
    testDb.exec(SCHEMA)
  })

  afterEach(() => {
    testDb.close()
  })

  // ── COE CRUD ──

  describe('COEs', () => {
    it('should create a COE and return it', () => {
      const coe = catalogRepository.createCoe('Engineering')
      expect(coe.id).toBeDefined()
      expect(coe.name).toBe('Engineering')
      expect(coe.is_active).toBe(1)
      expect(coe.sort_order).toBe(100)
    })

    it('should get all COEs ordered by sort_order then name', () => {
      catalogRepository.createCoe('Zebra')
      catalogRepository.createCoe('Alpha')
      const all = catalogRepository.getAllCoes()
      expect(all.length).toBe(2)
      expect(all[0].name).toBe('Alpha')
      expect(all[1].name).toBe('Zebra')
    })

    it('should get a single COE by id', () => {
      const created = catalogRepository.createCoe('Test COE')
      const fetched = catalogRepository.getCoe(created.id)
      expect(fetched).not.toBeNull()
      expect(fetched!.name).toBe('Test COE')
      expect(fetched!.practices).toEqual([])
    })

    it('should return null for non-existent COE', () => {
      expect(catalogRepository.getCoe(999)).toBeNull()
    })

    it('should update COE name', () => {
      const coe = catalogRepository.createCoe('Old Name')
      const updated = catalogRepository.updateCoe(coe.id, { name: 'New Name' })
      expect(updated.name).toBe('New Name')
    })

    it('should update COE sort_order', () => {
      const coe = catalogRepository.createCoe('Test')
      const updated = catalogRepository.updateCoe(coe.id, { sort_order: 10 })
      expect(updated.sort_order).toBe(10)
    })

    it('should toggle COE active status', () => {
      const coe = catalogRepository.createCoe('Toggle Test')
      expect(coe.is_active).toBe(1)

      const toggled = catalogRepository.toggleCoeActive(coe.id)
      expect(toggled.is_active).toBe(0)

      const toggledBack = catalogRepository.toggleCoeActive(coe.id)
      expect(toggledBack.is_active).toBe(1)
    })

    it('should enforce unique name constraint', () => {
      catalogRepository.createCoe('Unique')
      expect(() => catalogRepository.createCoe('Unique')).toThrow()
    })
  })

  // ── Practice CRUD ──

  describe('Practices', () => {
    it('should create a Practice and return it', () => {
      const practice = catalogRepository.createPractice('.NET')
      expect(practice.id).toBeDefined()
      expect(practice.name).toBe('.NET')
      expect(practice.is_active).toBe(1)
    })

    it('should get all Practices', () => {
      catalogRepository.createPractice('JavaScript')
      catalogRepository.createPractice('.NET')
      const all = catalogRepository.getAllPractices()
      expect(all.length).toBe(2)
      // Sorted by sort_order then name
      expect(all[0].name).toBe('.NET')
      expect(all[1].name).toBe('JavaScript')
    })

    it('should get a single Practice with relations', () => {
      const practice = catalogRepository.createPractice('Test Practice')
      const fetched = catalogRepository.getPractice(practice.id)
      expect(fetched).not.toBeNull()
      expect(fetched!.skills).toEqual([])
      expect(fetched!.coes).toEqual([])
    })

    it('should update Practice name', () => {
      const practice = catalogRepository.createPractice('Old')
      const updated = catalogRepository.updatePractice(practice.id, { name: 'New' })
      expect(updated.name).toBe('New')
    })

    it('should toggle Practice active status', () => {
      const practice = catalogRepository.createPractice('Toggle')
      const toggled = catalogRepository.togglePracticeActive(practice.id)
      expect(toggled.is_active).toBe(0)
    })

    it('should enforce unique name constraint', () => {
      catalogRepository.createPractice('Unique')
      expect(() => catalogRepository.createPractice('Unique')).toThrow()
    })
  })

  // ── Skill CRUD ──

  describe('Skills', () => {
    it('should create a Skill and return it', () => {
      const skill = catalogRepository.createSkill('React')
      expect(skill.id).toBeDefined()
      expect(skill.name).toBe('React')
    })

    it('should get all Skills', () => {
      catalogRepository.createSkill('Vue')
      catalogRepository.createSkill('Angular')
      const all = catalogRepository.getAllSkills()
      expect(all.length).toBe(2)
      expect(all[0].name).toBe('Angular')
    })

    it('should update Skill', () => {
      const skill = catalogRepository.createSkill('Reat')
      const updated = catalogRepository.updateSkill(skill.id, { name: 'React' })
      expect(updated.name).toBe('React')
    })

    it('should toggle Skill active status', () => {
      const skill = catalogRepository.createSkill('Toggle')
      const toggled = catalogRepository.toggleSkillActive(skill.id)
      expect(toggled.is_active).toBe(0)
    })
  })

  // ── Junction: COE ↔ Practice ──

  describe('COE ↔ Practice junction', () => {
    it('should add a practice to a COE', () => {
      const coe = catalogRepository.createCoe('SE')
      const practice = catalogRepository.createPractice('.NET')

      catalogRepository.addPracticeToCoe(coe.id, practice.id)

      const fetched = catalogRepository.getCoe(coe.id)
      expect(fetched!.practices).toHaveLength(1)
      expect(fetched!.practices[0].name).toBe('.NET')
    })

    it('should remove a practice from a COE', () => {
      const coe = catalogRepository.createCoe('SE')
      const practice = catalogRepository.createPractice('.NET')
      catalogRepository.addPracticeToCoe(coe.id, practice.id)

      catalogRepository.removePracticeFromCoe(coe.id, practice.id)

      const fetched = catalogRepository.getCoe(coe.id)
      expect(fetched!.practices).toHaveLength(0)
    })

    it('should not duplicate junction entries on re-add', () => {
      const coe = catalogRepository.createCoe('SE')
      const practice = catalogRepository.createPractice('.NET')
      catalogRepository.addPracticeToCoe(coe.id, practice.id)
      catalogRepository.addPracticeToCoe(coe.id, practice.id) // duplicate

      const fetched = catalogRepository.getCoe(coe.id)
      expect(fetched!.practices).toHaveLength(1)
    })

    it('should show parent COEs on practice', () => {
      const coe = catalogRepository.createCoe('SE')
      const practice = catalogRepository.createPractice('.NET')
      catalogRepository.addPracticeToCoe(coe.id, practice.id)

      const fetched = catalogRepository.getPractice(practice.id)
      expect(fetched!.coes).toHaveLength(1)
      expect(fetched!.coes[0].name).toBe('SE')
    })

    it('should cascade delete junctions when COE is deleted', () => {
      const coe = catalogRepository.createCoe('Temp COE')
      const practice = catalogRepository.createPractice('Temp Practice')
      catalogRepository.addPracticeToCoe(coe.id, practice.id)

      // Delete the COE directly
      testDb.prepare('DELETE FROM catalog_coes WHERE id = ?').run(coe.id)

      // Junction should be gone
      const count = testDb.prepare('SELECT COUNT(*) as cnt FROM catalog_coe_practices WHERE coe_id = ?').get(coe.id) as { cnt: number }
      expect(count.cnt).toBe(0)
    })
  })

  // ── Junction: Practice ↔ Skill ──

  describe('Practice ↔ Skill junction', () => {
    it('should add a skill to a practice', () => {
      const practice = catalogRepository.createPractice('JavaScript')
      const skill = catalogRepository.createSkill('React')

      catalogRepository.addSkillToPractice(practice.id, skill.id)

      const fetched = catalogRepository.getPractice(practice.id)
      expect(fetched!.skills).toHaveLength(1)
      expect(fetched!.skills[0].name).toBe('React')
    })

    it('should remove a skill from a practice', () => {
      const practice = catalogRepository.createPractice('JavaScript')
      const skill = catalogRepository.createSkill('React')
      catalogRepository.addSkillToPractice(practice.id, skill.id)

      catalogRepository.removeSkillFromPractice(practice.id, skill.id)

      const fetched = catalogRepository.getPractice(practice.id)
      expect(fetched!.skills).toHaveLength(0)
    })

    it('should show parent practices on skill', () => {
      const practice = catalogRepository.createPractice('JavaScript')
      const skill = catalogRepository.createSkill('React')
      catalogRepository.addSkillToPractice(practice.id, skill.id)

      const fetched = catalogRepository.getSkill(skill.id)
      expect(fetched!.practices).toHaveLength(1)
      expect(fetched!.practices[0].name).toBe('JavaScript')
    })

    it('should cascade delete junctions when practice is deleted', () => {
      const practice = catalogRepository.createPractice('Temp')
      const skill = catalogRepository.createSkill('Temp Skill')
      catalogRepository.addSkillToPractice(practice.id, skill.id)

      // Remove from any COEs first (RESTRICT constraint)
      testDb.prepare('DELETE FROM catalog_practices WHERE id = ?').run(practice.id)

      const count = testDb.prepare('SELECT COUNT(*) as cnt FROM catalog_practice_skills WHERE practice_id = ?').get(practice.id) as { cnt: number }
      expect(count.cnt).toBe(0)
    })
  })

  // ── Sort order ──

  describe('Sort order', () => {
    it('should sort COEs by sort_order then name', () => {
      const c1 = catalogRepository.createCoe('Zebra')
      catalogRepository.updateCoe(c1.id, { sort_order: 1 })
      const c2 = catalogRepository.createCoe('Alpha')
      catalogRepository.updateCoe(c2.id, { sort_order: 2 })

      const all = catalogRepository.getAllCoes()
      expect(all[0].name).toBe('Zebra')
      expect(all[1].name).toBe('Alpha')
    })
  })
})
