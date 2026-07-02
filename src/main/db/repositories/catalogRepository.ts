import { getDatabase } from '../connection'

// ── Row types ──

export interface CatalogCoeRow {
  id: number
  name: string
  is_active: number
  sort_order: number
  created_at: string
  updated_at: string
}

export interface CatalogPracticeRow {
  id: number
  name: string
  is_active: number
  sort_order: number
  created_at: string
  updated_at: string
}

export interface CatalogSkillRow {
  id: number
  name: string
  is_active: number
  sort_order: number
  created_at: string
  updated_at: string
}

// ── Enriched types ──

export interface CoeWithPractices extends CatalogCoeRow {
  practices: { id: number; name: string }[]
}

export interface PracticeWithRelations extends CatalogPracticeRow {
  skills: { id: number; name: string }[]
  coes: { id: number; name: string }[]
}

export interface SkillWithPractices extends CatalogSkillRow {
  practices: { id: number; name: string }[]
}

// ── Helpers ──

function attachPracticesToCoe(coe: CatalogCoeRow): CoeWithPractices {
  const db = getDatabase()
  const practices = db.prepare(`
    SELECT p.id, p.name FROM catalog_practices p
    JOIN catalog_coe_practices cp ON cp.practice_id = p.id
    WHERE cp.coe_id = ?
    ORDER BY p.sort_order, p.name
  `).all(coe.id) as { id: number; name: string }[]
  return { ...coe, practices }
}

function attachRelationsToPractice(practice: CatalogPracticeRow): PracticeWithRelations {
  const db = getDatabase()
  const skills = db.prepare(`
    SELECT s.id, s.name FROM catalog_skills s
    JOIN catalog_practice_skills ps ON ps.skill_id = s.id
    WHERE ps.practice_id = ?
    ORDER BY s.sort_order, s.name
  `).all(practice.id) as { id: number; name: string }[]
  const coes = db.prepare(`
    SELECT c.id, c.name FROM catalog_coes c
    JOIN catalog_coe_practices cp ON cp.coe_id = c.id
    WHERE cp.practice_id = ?
    ORDER BY c.sort_order, c.name
  `).all(practice.id) as { id: number; name: string }[]
  return { ...practice, skills, coes }
}

function attachPracticesToSkill(skill: CatalogSkillRow): SkillWithPractices {
  const db = getDatabase()
  const practices = db.prepare(`
    SELECT p.id, p.name FROM catalog_practices p
    JOIN catalog_practice_skills ps ON ps.practice_id = p.id
    WHERE ps.skill_id = ?
    ORDER BY p.sort_order, p.name
  `).all(skill.id) as { id: number; name: string }[]
  return { ...skill, practices }
}

function now(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19)
}

// ── Repository ──

export const catalogRepository = {
  // ── COEs ──

  getAllCoes(): CoeWithPractices[] {
    const db = getDatabase()
    const rows = db.prepare('SELECT * FROM catalog_coes ORDER BY sort_order, name').all() as CatalogCoeRow[]
    return rows.map(attachPracticesToCoe)
  },

  getCoe(id: number): CoeWithPractices | null {
    const db = getDatabase()
    const row = db.prepare('SELECT * FROM catalog_coes WHERE id = ?').get(id) as CatalogCoeRow | undefined
    return row ? attachPracticesToCoe(row) : null
  },

  createCoe(name: string): CatalogCoeRow {
    const db = getDatabase()
    const ts = now()
    const result = db.prepare(
      'INSERT INTO catalog_coes (name, created_at, updated_at) VALUES (?, ?, ?)'
    ).run(name, ts, ts)
    return db.prepare('SELECT * FROM catalog_coes WHERE id = ?').get(result.lastInsertRowid) as CatalogCoeRow
  },

  updateCoe(id: number, data: { name?: string; sort_order?: number }): CatalogCoeRow {
    const db = getDatabase()
    const ts = now()
    if (data.name !== undefined) {
      db.prepare('UPDATE catalog_coes SET name = ?, updated_at = ? WHERE id = ?').run(data.name, ts, id)
    }
    if (data.sort_order !== undefined) {
      db.prepare('UPDATE catalog_coes SET sort_order = ?, updated_at = ? WHERE id = ?').run(data.sort_order, ts, id)
    }
    return db.prepare('SELECT * FROM catalog_coes WHERE id = ?').get(id) as CatalogCoeRow
  },

  toggleCoeActive(id: number): CatalogCoeRow {
    const db = getDatabase()
    const ts = now()
    db.prepare('UPDATE catalog_coes SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END, updated_at = ? WHERE id = ?').run(ts, id)
    return db.prepare('SELECT * FROM catalog_coes WHERE id = ?').get(id) as CatalogCoeRow
  },

  addPracticeToCoe(coeId: number, practiceId: number): void {
    const db = getDatabase()
    db.prepare('INSERT OR IGNORE INTO catalog_coe_practices (coe_id, practice_id) VALUES (?, ?)').run(coeId, practiceId)
  },

  removePracticeFromCoe(coeId: number, practiceId: number): void {
    const db = getDatabase()
    db.prepare('DELETE FROM catalog_coe_practices WHERE coe_id = ? AND practice_id = ?').run(coeId, practiceId)
  },

  // ── Practices ──

  getAllPractices(): PracticeWithRelations[] {
    const db = getDatabase()
    const rows = db.prepare('SELECT * FROM catalog_practices ORDER BY sort_order, name').all() as CatalogPracticeRow[]
    return rows.map(attachRelationsToPractice)
  },

  getPractice(id: number): PracticeWithRelations | null {
    const db = getDatabase()
    const row = db.prepare('SELECT * FROM catalog_practices WHERE id = ?').get(id) as CatalogPracticeRow | undefined
    return row ? attachRelationsToPractice(row) : null
  },

  createPractice(name: string): CatalogPracticeRow {
    const db = getDatabase()
    const ts = now()
    const result = db.prepare(
      'INSERT INTO catalog_practices (name, created_at, updated_at) VALUES (?, ?, ?)'
    ).run(name, ts, ts)
    return db.prepare('SELECT * FROM catalog_practices WHERE id = ?').get(result.lastInsertRowid) as CatalogPracticeRow
  },

  updatePractice(id: number, data: { name?: string; sort_order?: number }): CatalogPracticeRow {
    const db = getDatabase()
    const ts = now()
    if (data.name !== undefined) {
      db.prepare('UPDATE catalog_practices SET name = ?, updated_at = ? WHERE id = ?').run(data.name, ts, id)
    }
    if (data.sort_order !== undefined) {
      db.prepare('UPDATE catalog_practices SET sort_order = ?, updated_at = ? WHERE id = ?').run(data.sort_order, ts, id)
    }
    return db.prepare('SELECT * FROM catalog_practices WHERE id = ?').get(id) as CatalogPracticeRow
  },

  togglePracticeActive(id: number): CatalogPracticeRow {
    const db = getDatabase()
    const ts = now()
    db.prepare('UPDATE catalog_practices SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END, updated_at = ? WHERE id = ?').run(ts, id)
    return db.prepare('SELECT * FROM catalog_practices WHERE id = ?').get(id) as CatalogPracticeRow
  },

  addSkillToPractice(practiceId: number, skillId: number): void {
    const db = getDatabase()
    db.prepare('INSERT OR IGNORE INTO catalog_practice_skills (practice_id, skill_id) VALUES (?, ?)').run(practiceId, skillId)
  },

  removeSkillFromPractice(practiceId: number, skillId: number): void {
    const db = getDatabase()
    db.prepare('DELETE FROM catalog_practice_skills WHERE practice_id = ? AND skill_id = ?').run(practiceId, skillId)
  },

  // ── Skills ──

  getAllSkills(): SkillWithPractices[] {
    const db = getDatabase()
    const rows = db.prepare('SELECT * FROM catalog_skills ORDER BY sort_order, name').all() as CatalogSkillRow[]
    return rows.map(attachPracticesToSkill)
  },

  getSkill(id: number): SkillWithPractices | null {
    const db = getDatabase()
    const row = db.prepare('SELECT * FROM catalog_skills WHERE id = ?').get(id) as CatalogSkillRow | undefined
    return row ? attachPracticesToSkill(row) : null
  },

  createSkill(name: string): CatalogSkillRow {
    const db = getDatabase()
    const ts = now()
    const result = db.prepare(
      'INSERT INTO catalog_skills (name, created_at, updated_at) VALUES (?, ?, ?)'
    ).run(name, ts, ts)
    return db.prepare('SELECT * FROM catalog_skills WHERE id = ?').get(result.lastInsertRowid) as CatalogSkillRow
  },

  updateSkill(id: number, data: { name?: string; sort_order?: number }): CatalogSkillRow {
    const db = getDatabase()
    const ts = now()
    if (data.name !== undefined) {
      db.prepare('UPDATE catalog_skills SET name = ?, updated_at = ? WHERE id = ?').run(data.name, ts, id)
    }
    if (data.sort_order !== undefined) {
      db.prepare('UPDATE catalog_skills SET sort_order = ?, updated_at = ? WHERE id = ?').run(data.sort_order, ts, id)
    }
    return db.prepare('SELECT * FROM catalog_skills WHERE id = ?').get(id) as CatalogSkillRow
  },

  toggleSkillActive(id: number): CatalogSkillRow {
    const db = getDatabase()
    const ts = now()
    db.prepare('UPDATE catalog_skills SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END, updated_at = ? WHERE id = ?').run(ts, id)
    return db.prepare('SELECT * FROM catalog_skills WHERE id = ?').get(id) as CatalogSkillRow
  },
}
