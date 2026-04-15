import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() },
  app: { getPath: () => '/tmp', getAppPath: () => '/tmp/app', isPackaged: false },
}))

vi.mock('../../services/logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

vi.mock('../errorHandler', () => ({
  wrapIpcHandler: vi.fn((_channel: string, handler: Function) => handler),
}))

vi.mock('../../services/pathService', () => ({
  pathService: {
    getDeveloperDashboard: vi.fn().mockResolvedValue({ id: 1, name: 'Dev' }),
    listLearningPaths: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    getLearningPath: vi.fn().mockResolvedValue({ id: 1, title: 'Path' }),
    createLearningPath: vi.fn().mockResolvedValue({ id: 1 }),
    updateLearningPath: vi.fn().mockResolvedValue({ success: true }),
    deleteLearningPath: vi.fn().mockResolvedValue({ success: true }),
    listAssessments: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    getAssessment: vi.fn().mockResolvedValue(null),
    saveAssessmentDraft: vi.fn().mockResolvedValue({ success: true }),
    submitAssessment: vi.fn().mockResolvedValue({ success: true }),
    listDiscussionThreads: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    getDiscussionThread: vi.fn().mockResolvedValue(null),
    createDiscussionPost: vi.fn().mockResolvedValue({ id: 1 }),
    replyDiscussionPost: vi.fn().mockResolvedValue({ id: 1 }),
    listDossiers: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    getDossier: vi.fn().mockResolvedValue(null),
    updateDossierStatus: vi.fn().mockResolvedValue({ success: true }),
    getAdminAnalytics: vi.fn().mockResolvedValue({}),
    getSettings: vi.fn().mockResolvedValue({}),
    saveSettings: vi.fn().mockResolvedValue({ success: true }),
  },
}))

vi.mock('../../db/path/repositories/adminRepository', () => ({
  adminRepository: { saveEvent: vi.fn() },
}))

vi.mock('../../db/path/repositories/learningPathRepository', () => ({
  learningPathRepository: {},
}))

vi.mock('../../services/readinessCalculator', () => ({
  calculateReadiness: vi.fn(),
}))

vi.mock('../../services/pathAiService', () => ({
  pathAiService: {
    generateDefensePrep: vi.fn(),
    generateRemediation: vi.fn(),
  },
}))

vi.mock('../../services/dynamicContentService', () => ({
  dynamicContentService: {
    searchResources: vi.fn(),
  },
}))

import { registerPathHandlers } from '../path.ipc'
import { pathService } from '../../services/pathService'
import { ipcMain } from 'electron'

const mockHandle = vi.mocked(ipcMain.handle)

function getHandler(channel: string) {
  const call = mockHandle.mock.calls.find(([ch]: [string]) => ch === channel)
  if (!call) throw new Error(`Handler for ${channel} not registered`)
  return call[1]
}

const fakeEvent = { senderFrame: { url: 'file:///index.html' } }

describe('path.ipc integration', () => {
  beforeAll(() => {
    registerPathHandlers()
  })

  it('should register path handlers', () => {
    expect(mockHandle).toHaveBeenCalled()
    expect(mockHandle.mock.calls.length).toBeGreaterThanOrEqual(10)
  })

  it('path:get-developer-dashboard should delegate to pathService', async () => {
    const handler = getHandler('path:get-developer-dashboard')
    const result = await handler(fakeEvent, { id: 42 })
    expect(pathService.getDeveloperDashboard).toHaveBeenCalledWith({ id: 42 })
    expect(result).toEqual({ id: 1, name: 'Dev' })
  })

  it('path:list-learning-paths should delegate to pathService', async () => {
    const handler = getHandler('path:list-learning-paths')
    const result = await handler(fakeEvent, { search: 'react', page: 1, pageSize: 10 })
    expect(pathService.listLearningPaths).toHaveBeenCalledWith({ search: 'react', page: 1, pageSize: 10 })
    expect(result).toEqual({ items: [], total: 0 })
  })

  it('path:create-learning-path should delegate to pathService', async () => {
    const handler = getHandler('path:create-learning-path')
    const params = { title: 'New Path', level: 'beginner', ownerId: 1 }
    const result = await handler(fakeEvent, params)
    expect(pathService.createLearningPath).toHaveBeenCalledWith(params)
    expect(result).toEqual({ id: 1 })
  })

  it('path:delete-learning-path should delegate to pathService', async () => {
    const handler = getHandler('path:delete-learning-path')
    const result = await handler(fakeEvent, { id: 5 })
    expect(pathService.deleteLearningPath).toHaveBeenCalledWith({ id: 5 })
    expect(result).toEqual({ success: true })
  })
})
