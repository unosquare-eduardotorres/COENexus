import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

const mockRows: Record<string, unknown>[] = []
const mockDb = {
  prepare: vi.fn().mockReturnValue({
    run: vi.fn().mockReturnValue({ lastInsertRowid: 1, changes: 1 }),
    get: vi.fn().mockImplementation(() => mockRows[0] ?? null),
    all: vi.fn().mockImplementation(() => mockRows),
  }),
  exec: vi.fn(),
  pragma: vi.fn(),
}

vi.mock('../../db/path/pathConnection', () => ({
  getPathDatabase: () => mockDb,
}))

import { pathService } from '../pathService'

describe('pathService integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRows.length = 0
  })

  it('should call database for createLearningPath', () => {
    const result = pathService.createLearningPath({
      title: 'React Mastery',
      level: 'intermediate',
      ownerId: null,
    })
    expect(result).toBeDefined()
    expect(mockDb.prepare).toHaveBeenCalled()
  })

  it('should call database for listLearningPaths', () => {
    mockRows.push({ id: 1, title: 'Path 1' })
    const result = pathService.listLearningPaths({ page: 1, pageSize: 10 })
    expect(result).toBeDefined()
    expect(mockDb.prepare).toHaveBeenCalled()
  })

  it('should call database for getLearningPath', () => {
    mockRows.push({ id: 1, title: 'Path', summary: '', status: 'draft' })
    const result = pathService.getLearningPath({ id: 1 })
    expect(mockDb.prepare).toHaveBeenCalled()
  })

  it('should call database for updateLearningPath', () => {
    const result = pathService.updateLearningPath({ id: 1, title: 'Updated' })
    expect(result).toBeDefined()
    expect(mockDb.prepare).toHaveBeenCalled()
  })

  it('should call database for deleteLearningPath', () => {
    const result = pathService.deleteLearningPath({ id: 1 })
    expect(result).toBeDefined()
    expect(mockDb.prepare).toHaveBeenCalled()
  })

  it('should call database for getDeveloperDashboard', () => {
    const result = pathService.getDeveloperDashboard({ id: 42 })
    expect(mockDb.prepare).toHaveBeenCalled()
  })

  it('should call database for getSettings', () => {
    const result = pathService.getSettings()
    expect(mockDb.prepare).toHaveBeenCalled()
  })

  it('should call database for saveSettings', () => {
    const result = pathService.saveSettings({ autoAssign: true })
    expect(result).toBeDefined()
    expect(mockDb.prepare).toHaveBeenCalled()
  })
})
