import { describe, it, expect, vi, beforeEach } from 'vitest'
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, copyFileSync } from 'fs'

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp/test-userdata'),
  },
}))

vi.mock('../../db/connection', () => ({
  getDatabase: vi.fn(() => ({
    prepare: vi.fn(() => ({
      get: vi.fn().mockReturnValue({ c: 42 }),
    })),
    pragma: vi.fn(),
  })),
  closeDatabase: vi.fn(),
  initDatabase: vi.fn(),
}))

vi.mock('../logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  readdirSync: vi.fn(),
  statSync: vi.fn(),
  copyFileSync: vi.fn(),
}))

describe('databaseSharingService', () => {
  const mockExistsSync = vi.mocked(existsSync)
  const mockReadFileSync = vi.mocked(readFileSync)
  const mockWriteFileSync = vi.mocked(writeFileSync)
  const mockReaddirSync = vi.mocked(readdirSync)
  const mockStatSync = vi.mocked(statSync)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getConfig', () => {
    it('should return defaults when config file does not exist', async () => {
      mockExistsSync.mockReturnValue(false)

      const { databaseSharingService } = await import('../databaseSharingService')
      const config = databaseSharingService.getConfig()

      expect(config).toEqual({ sharedPath: '', exporterName: '' })
    })

    it('should parse existing config file', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(JSON.stringify({
        sharedPath: '/shared/path',
        exporterName: 'Test User',
      }))

      const { databaseSharingService } = await import('../databaseSharingService')
      const config = databaseSharingService.getConfig()

      expect(config.sharedPath).toBe('/shared/path')
      expect(config.exporterName).toBe('Test User')
    })

    it('should return defaults on parse error', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockImplementation(() => { throw new Error('Read error') })

      const { databaseSharingService } = await import('../databaseSharingService')
      const config = databaseSharingService.getConfig()

      expect(config).toEqual({ sharedPath: '', exporterName: '' })
    })
  })

  describe('saveConfig', () => {
    it('should write config to file', async () => {
      const { databaseSharingService } = await import('../databaseSharingService')
      databaseSharingService.saveConfig({ sharedPath: '/new/path', exporterName: 'New User' })

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining('db-sharing-config.json'),
        expect.stringContaining('/new/path'),
        'utf-8'
      )
    })
  })

  describe('exportSnapshot', () => {
    it('should throw when shared path not configured', async () => {
      mockExistsSync.mockReturnValue(false)

      const { databaseSharingService } = await import('../databaseSharingService')
      expect(() => databaseSharingService.exportSnapshot()).toThrow('Shared path not configured')
    })
  })

  describe('importSnapshot', () => {
    it('should throw when shared path not configured', async () => {
      mockExistsSync.mockReturnValue(false)

      const { databaseSharingService } = await import('../databaseSharingService')
      expect(() => databaseSharingService.importSnapshot('test.db')).toThrow('Shared path not configured')
    })
  })

  describe('importFromAbsolutePath', () => {
    it('should throw when file does not exist', async () => {
      mockExistsSync.mockReturnValue(false)

      const { databaseSharingService } = await import('../databaseSharingService')
      expect(() => databaseSharingService.importFromAbsolutePath('/nonexistent.db')).toThrow('File not found')
    })
  })

  describe('listSnapshots', () => {
    it('should return empty array when shared path not configured', async () => {
      mockExistsSync.mockReturnValue(false)

      const { databaseSharingService } = await import('../databaseSharingService')
      const snapshots = databaseSharingService.listSnapshots()

      expect(snapshots).toEqual([])
    })
  })

  describe('TABLES constant', () => {
    it('should include all expected tables', () => {
      const tables = [
        'synced_employees', 'synced_candidates', 'synced_open_positions',
        'resume_embeddings', 'match_sessions', 'resume_sessions',
        'transform_sessions', 'open_position_candidates',
      ]
      expect(tables).toHaveLength(8)
      expect(tables).toContain('synced_employees')
      expect(tables).toContain('resume_embeddings')
      expect(tables).toContain('match_sessions')
    })
  })
})
