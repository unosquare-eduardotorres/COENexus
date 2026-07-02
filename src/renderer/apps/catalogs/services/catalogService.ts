import type {
  CatalogCoe,
  CatalogPractice,
  CatalogSkill,
  CatalogCoeRow,
  CatalogPracticeRow,
  CatalogSkillRow,
} from '../../../../shared/ipc-types'

export const catalogService = {
  // ── COEs ──
  getCoes: (): Promise<CatalogCoe[]> =>
    window.api.catalog.getCoes(),
  getCoe: (id: number): Promise<CatalogCoe | null> =>
    window.api.catalog.getCoe(id),
  createCoe: (name: string): Promise<CatalogCoeRow> =>
    window.api.catalog.createCoe({ name }),
  updateCoe: (id: number, data: { name?: string; sort_order?: number }): Promise<CatalogCoeRow> =>
    window.api.catalog.updateCoe({ id, ...data }),
  toggleCoe: (id: number): Promise<CatalogCoeRow> =>
    window.api.catalog.toggleCoe(id),
  addPracticeToCoe: (coeId: number, practiceId: number): Promise<{ success: boolean }> =>
    window.api.catalog.addPracticeToCoe({ parentId: coeId, childId: practiceId }),
  removePracticeFromCoe: (coeId: number, practiceId: number): Promise<{ success: boolean }> =>
    window.api.catalog.removePracticeFromCoe({ parentId: coeId, childId: practiceId }),

  // ── Practices ──
  getPractices: (): Promise<CatalogPractice[]> =>
    window.api.catalog.getPractices(),
  getPractice: (id: number): Promise<CatalogPractice | null> =>
    window.api.catalog.getPractice(id),
  createPractice: (name: string): Promise<CatalogPracticeRow> =>
    window.api.catalog.createPractice({ name }),
  updatePractice: (id: number, data: { name?: string; sort_order?: number }): Promise<CatalogPracticeRow> =>
    window.api.catalog.updatePractice({ id, ...data }),
  togglePractice: (id: number): Promise<CatalogPracticeRow> =>
    window.api.catalog.togglePractice(id),
  addSkillToPractice: (practiceId: number, skillId: number): Promise<{ success: boolean }> =>
    window.api.catalog.addSkillToPractice({ parentId: practiceId, childId: skillId }),
  removeSkillFromPractice: (practiceId: number, skillId: number): Promise<{ success: boolean }> =>
    window.api.catalog.removeSkillFromPractice({ parentId: practiceId, childId: skillId }),

  // ── Skills ──
  getSkills: (): Promise<CatalogSkill[]> =>
    window.api.catalog.getSkills(),
  getSkill: (id: number): Promise<CatalogSkill | null> =>
    window.api.catalog.getSkill(id),
  createSkill: (name: string): Promise<CatalogSkillRow> =>
    window.api.catalog.createSkill({ name }),
  updateSkill: (id: number, data: { name?: string; sort_order?: number }): Promise<CatalogSkillRow> =>
    window.api.catalog.updateSkill({ id, ...data }),
  toggleSkill: (id: number): Promise<CatalogSkillRow> =>
    window.api.catalog.toggleSkill(id),
}
