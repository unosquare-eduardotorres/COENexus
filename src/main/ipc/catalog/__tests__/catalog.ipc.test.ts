import { beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() },
  app: { getPath: () => '/tmp', getAppPath: () => '/tmp/app', isPackaged: false },
}))

vi.mock('../../../services/logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

vi.mock('../../errorHandler', () => ({
  wrapIpcHandler: vi.fn((_channel: string, handler: Function) => handler),
}))

const mockAllCoes = vi.fn().mockReturnValue([{ id: 1, name: 'SE', is_active: 1, sort_order: 100, practices: [] }])
const mockGetCoe = vi.fn().mockReturnValue({ id: 1, name: 'SE', is_active: 1, sort_order: 100, practices: [] })
const mockCreateCoe = vi.fn().mockReturnValue({ id: 2, name: 'New', is_active: 1, sort_order: 100 })
const mockUpdateCoe = vi.fn().mockReturnValue({ id: 1, name: 'Updated', is_active: 1, sort_order: 50 })
const mockToggleCoe = vi.fn().mockReturnValue({ id: 1, name: 'SE', is_active: 0, sort_order: 100 })
const mockAddPracticeToCoe = vi.fn()
const mockRemovePracticeFromCoe = vi.fn()

const mockAllPractices = vi.fn().mockReturnValue([{ id: 1, name: '.NET', is_active: 1, skills: [], coes: [] }])
const mockGetPractice = vi.fn().mockReturnValue({ id: 1, name: '.NET', is_active: 1, skills: [], coes: [] })
const mockCreatePractice = vi.fn().mockReturnValue({ id: 2, name: 'New', is_active: 1, sort_order: 100 })
const mockUpdatePractice = vi.fn().mockReturnValue({ id: 1, name: 'Updated', is_active: 1, sort_order: 50 })
const mockTogglePractice = vi.fn().mockReturnValue({ id: 1, name: '.NET', is_active: 0 })
const mockAddSkillToPractice = vi.fn()
const mockRemoveSkillFromPractice = vi.fn()

const mockAllSkills = vi.fn().mockReturnValue([{ id: 1, name: 'React', is_active: 1, practices: [] }])
const mockGetSkill = vi.fn().mockReturnValue({ id: 1, name: 'React', is_active: 1, practices: [] })
const mockCreateSkill = vi.fn().mockReturnValue({ id: 2, name: 'New', is_active: 1, sort_order: 100 })
const mockUpdateSkill = vi.fn().mockReturnValue({ id: 1, name: 'Updated', is_active: 1, sort_order: 50 })
const mockToggleSkill = vi.fn().mockReturnValue({ id: 1, name: 'React', is_active: 0 })

vi.mock('../../../db/repositories/catalogRepository', () => ({
  catalogRepository: {
    getAllCoes: () => mockAllCoes(),
    getCoe: (id: number) => mockGetCoe(id),
    createCoe: (name: string) => mockCreateCoe(name),
    updateCoe: (id: number, data: object) => mockUpdateCoe(id, data),
    toggleCoeActive: (id: number) => mockToggleCoe(id),
    addPracticeToCoe: (coeId: number, practiceId: number) => mockAddPracticeToCoe(coeId, practiceId),
    removePracticeFromCoe: (coeId: number, practiceId: number) => mockRemovePracticeFromCoe(coeId, practiceId),

    getAllPractices: () => mockAllPractices(),
    getPractice: (id: number) => mockGetPractice(id),
    createPractice: (name: string) => mockCreatePractice(name),
    updatePractice: (id: number, data: object) => mockUpdatePractice(id, data),
    togglePracticeActive: (id: number) => mockTogglePractice(id),
    addSkillToPractice: (pId: number, sId: number) => mockAddSkillToPractice(pId, sId),
    removeSkillFromPractice: (pId: number, sId: number) => mockRemoveSkillFromPractice(pId, sId),

    getAllSkills: () => mockAllSkills(),
    getSkill: (id: number) => mockGetSkill(id),
    createSkill: (name: string) => mockCreateSkill(name),
    updateSkill: (id: number, data: object) => mockUpdateSkill(id, data),
    toggleSkillActive: (id: number) => mockToggleSkill(id),
  },
}))

import { registerCatalogHandlers } from '../catalog.ipc'
import { ipcMain } from 'electron'

const mockHandle = vi.mocked(ipcMain.handle)

function getHandler(channel: string) {
  const call = mockHandle.mock.calls.find(([ch]: [string]) => ch === channel)
  if (!call) throw new Error(`Handler for ${channel} not registered`)
  return call[1]
}

const fakeEvent = { senderFrame: { url: 'file:///index.html' } }

describe('catalog.ipc', () => {
  beforeAll(() => {
    registerCatalogHandlers()
  })

  it('should register 19 handlers', () => {
    expect(mockHandle.mock.calls.length).toBe(19)
  })

  // ── COEs ──

  it('CATALOG_GET_COES returns all COEs', async () => {
    const handler = getHandler('catalog:get-coes')
    const result = await handler(fakeEvent)
    expect(result).toEqual([{ id: 1, name: 'SE', is_active: 1, sort_order: 100, practices: [] }])
  })

  it('CATALOG_GET_COE returns a single COE', async () => {
    const handler = getHandler('catalog:get-coe')
    const result = await handler(fakeEvent, 1)
    expect(mockGetCoe).toHaveBeenCalledWith(1)
    expect(result).toHaveProperty('name', 'SE')
  })

  it('CATALOG_CREATE_COE creates a COE', async () => {
    const handler = getHandler('catalog:create-coe')
    const result = await handler(fakeEvent, { name: 'New' })
    expect(mockCreateCoe).toHaveBeenCalledWith('New')
    expect(result).toHaveProperty('id', 2)
  })

  it('CATALOG_UPDATE_COE updates a COE', async () => {
    const handler = getHandler('catalog:update-coe')
    const result = await handler(fakeEvent, { id: 1, name: 'Updated', sort_order: 50 })
    expect(mockUpdateCoe).toHaveBeenCalledWith(1, { name: 'Updated', sort_order: 50 })
    expect(result).toHaveProperty('name', 'Updated')
  })

  it('CATALOG_TOGGLE_COE toggles active', async () => {
    const handler = getHandler('catalog:toggle-coe')
    const result = await handler(fakeEvent, 1)
    expect(mockToggleCoe).toHaveBeenCalledWith(1)
    expect(result).toHaveProperty('is_active', 0)
  })

  it('CATALOG_ADD_PRACTICE_TO_COE adds junction', async () => {
    const handler = getHandler('catalog:add-practice-to-coe')
    const result = await handler(fakeEvent, { parentId: 1, childId: 2 })
    expect(mockAddPracticeToCoe).toHaveBeenCalledWith(1, 2)
    expect(result).toEqual({ success: true })
  })

  it('CATALOG_REMOVE_PRACTICE_FROM_COE removes junction', async () => {
    const handler = getHandler('catalog:remove-practice-from-coe')
    const result = await handler(fakeEvent, { parentId: 1, childId: 2 })
    expect(mockRemovePracticeFromCoe).toHaveBeenCalledWith(1, 2)
    expect(result).toEqual({ success: true })
  })

  // ── Practices ──

  it('CATALOG_GET_PRACTICES returns all practices', async () => {
    const handler = getHandler('catalog:get-practices')
    const result = await handler(fakeEvent)
    expect(result).toHaveLength(1)
  })

  it('CATALOG_GET_PRACTICE returns a single practice', async () => {
    const handler = getHandler('catalog:get-practice')
    const result = await handler(fakeEvent, 1)
    expect(result).toHaveProperty('name', '.NET')
  })

  it('CATALOG_CREATE_PRACTICE creates a practice', async () => {
    const handler = getHandler('catalog:create-practice')
    const result = await handler(fakeEvent, { name: 'New' })
    expect(mockCreatePractice).toHaveBeenCalledWith('New')
    expect(result).toHaveProperty('id', 2)
  })

  it('CATALOG_UPDATE_PRACTICE updates a practice', async () => {
    const handler = getHandler('catalog:update-practice')
    await handler(fakeEvent, { id: 1, name: 'Updated', sort_order: 50 })
    expect(mockUpdatePractice).toHaveBeenCalledWith(1, { name: 'Updated', sort_order: 50 })
  })

  it('CATALOG_TOGGLE_PRACTICE toggles active', async () => {
    const handler = getHandler('catalog:toggle-practice')
    const result = await handler(fakeEvent, 1)
    expect(result).toHaveProperty('is_active', 0)
  })

  it('CATALOG_ADD_SKILL_TO_PRACTICE adds junction', async () => {
    const handler = getHandler('catalog:add-skill-to-practice')
    const result = await handler(fakeEvent, { parentId: 1, childId: 3 })
    expect(mockAddSkillToPractice).toHaveBeenCalledWith(1, 3)
    expect(result).toEqual({ success: true })
  })

  it('CATALOG_REMOVE_SKILL_FROM_PRACTICE removes junction', async () => {
    const handler = getHandler('catalog:remove-skill-from-practice')
    const result = await handler(fakeEvent, { parentId: 1, childId: 3 })
    expect(mockRemoveSkillFromPractice).toHaveBeenCalledWith(1, 3)
    expect(result).toEqual({ success: true })
  })

  // ── Skills ──

  it('CATALOG_GET_SKILLS returns all skills', async () => {
    const handler = getHandler('catalog:get-skills')
    const result = await handler(fakeEvent)
    expect(result).toHaveLength(1)
  })

  it('CATALOG_GET_SKILL returns a single skill', async () => {
    const handler = getHandler('catalog:get-skill')
    const result = await handler(fakeEvent, 1)
    expect(result).toHaveProperty('name', 'React')
  })

  it('CATALOG_CREATE_SKILL creates a skill', async () => {
    const handler = getHandler('catalog:create-skill')
    const result = await handler(fakeEvent, { name: 'New' })
    expect(mockCreateSkill).toHaveBeenCalledWith('New')
    expect(result).toHaveProperty('id', 2)
  })

  it('CATALOG_UPDATE_SKILL updates a skill', async () => {
    const handler = getHandler('catalog:update-skill')
    await handler(fakeEvent, { id: 1, name: 'Updated', sort_order: 50 })
    expect(mockUpdateSkill).toHaveBeenCalledWith(1, { name: 'Updated', sort_order: 50 })
  })

  it('CATALOG_TOGGLE_SKILL toggles active', async () => {
    const handler = getHandler('catalog:toggle-skill')
    const result = await handler(fakeEvent, 1)
    expect(result).toHaveProperty('is_active', 0)
  })
})
