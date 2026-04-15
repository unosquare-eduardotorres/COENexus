import { beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() },
  app: { getPath: () => '/tmp', getAppPath: () => '/tmp/app', isPackaged: false },
  BrowserWindow: { getAllWindows: () => [{ webContents: { send: vi.fn() } }] },
}))

vi.mock('../../services/logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

vi.mock('../errorHandler', () => ({
  wrapIpcHandler: vi.fn((_channel: string, handler: Function) => handler),
}))

vi.mock('../../services/scout9JobManager', () => ({
  scout9JobManager: {
    start: vi.fn().mockResolvedValue({ jobId: 'j1' }),
    cancel: vi.fn(),
    isRunning: vi.fn().mockReturnValue(false),
    getActiveJobId: vi.fn().mockReturnValue(null),
  },
}))

vi.mock('../../services/scout9ScopeService', () => ({
  scout9ScopeService: {
    getScopeOptions: vi.fn().mockResolvedValue({ presets: [] }),
  },
}))

vi.mock('../../db/agents/repositories/reportRepository', () => ({
  reportRepository: {
    list: vi.fn().mockReturnValue([]),
    getById: vi.fn().mockReturnValue(null),
    updateCandidateStatus: vi.fn(),
    submitSkip: vi.fn(),
    listCandidates: vi.fn().mockReturnValue([]),
  },
}))

vi.mock('../../services/scout9BrainService', () => ({
  getTokenBudgetBreakdown: vi.fn().mockReturnValue({ total: 0, used: 0 }),
}))

vi.mock('../../db/agents/repositories/brainRepository', () => ({
  brainRepository: {
    getLatest: vi.fn().mockReturnValue(null),
  },
}))

vi.mock('../../db/agents/repositories/knowledgeRepository', () => ({
  knowledgeRepository: {
    listRules: vi.fn().mockReturnValue([]),
    createRule: vi.fn().mockReturnValue({ id: 1 }),
    updateRule: vi.fn(),
    deleteRule: vi.fn(),
    listGlossary: vi.fn().mockReturnValue([]),
    createGlossaryTerm: vi.fn().mockReturnValue({ id: 1 }),
    updateGlossaryTerm: vi.fn(),
    deleteGlossaryTerm: vi.fn(),
    listNotes: vi.fn().mockReturnValue([]),
    createNote: vi.fn().mockReturnValue({ id: 1 }),
    updateNote: vi.fn(),
    deleteNote: vi.fn(),
    listOverrides: vi.fn().mockReturnValue([]),
    createOverride: vi.fn().mockReturnValue({ id: 1 }),
    deleteOverride: vi.fn(),
    listPromptVersions: vi.fn().mockReturnValue([]),
    createPromptVersion: vi.fn().mockReturnValue({ id: 1 }),
    activatePromptVersion: vi.fn(),
    compile: vi.fn(),
  },
}))

vi.mock('../../db/agents/repositories/patternRepository', () => ({
  patternRepository: {
    list: vi.fn().mockReturnValue([]),
    toggle: vi.fn(),
  },
}))

vi.mock('../../db/agents/repositories/configRepository', () => ({
  getConfig: vi.fn().mockReturnValue({}),
  updateConfig: vi.fn(),
}))

import { registerScout9Handlers } from '../scout9.ipc'
import { scout9JobManager } from '../../services/scout9JobManager'
import { ipcMain } from 'electron'

const mockHandle = vi.mocked(ipcMain.handle)

function getHandler(channel: string) {
  const call = mockHandle.mock.calls.find(([ch]: [string]) => ch === channel)
  if (!call) throw new Error(`Handler for ${channel} not registered`)
  return call[1]
}

const fakeEvent = { senderFrame: { url: 'file:///index.html' } }

describe('scout9.ipc integration', () => {
  beforeAll(() => {
    registerScout9Handlers()
  })

  it('should register scout9 handlers', () => {
    expect(mockHandle.mock.calls.length).toBeGreaterThanOrEqual(15)
  })

  it('scout9:get-status should return running status', async () => {
    const handler = getHandler('scout9:get-status')
    const result = await handler(fakeEvent)
    expect(result).toBeDefined()
  })

  it('scout9:list-reports should return reports', async () => {
    const handler = getHandler('scout9:list-reports')
    const result = await handler(fakeEvent, {})
    expect(result).toBeDefined()
  })
})
