import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

let mockFs: Record<string, Buffer> = {}

vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: vi.fn().mockReturnValue(true),
    encryptString: vi.fn((s: string) => Buffer.from(`enc:${s}`)),
    decryptString: vi.fn((buf: Buffer) => buf.toString().replace('enc:', '')),
  },
  app: {
    getPath: vi.fn().mockReturnValue('/tmp/test-userdata'),
  },
}))

vi.mock('fs', () => ({
  existsSync: vi.fn((path: string) => path in mockFs),
  readFileSync: vi.fn((path: string) => {
    if (!(path in mockFs)) throw new Error('ENOENT')
    return mockFs[path]
  }),
  writeFileSync: vi.fn((path: string, data: Buffer) => {
    mockFs[path] = data
  }),
  unlinkSync: vi.fn((path: string) => {
    delete mockFs[path]
  }),
}))

import { keychainService } from '../keychainService'
import { safeStorage } from 'electron'

describe('keychainService', () => {
  beforeEach(() => {
    mockFs = {}
    vi.clearAllMocks()
    vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(true)
    vi.mocked(safeStorage.encryptString).mockImplementation((s: string) => Buffer.from(`enc:${s}`))
    vi.mocked(safeStorage.decryptString).mockImplementation((buf: Buffer) => buf.toString().replace('enc:', ''))
  })

  describe('getVoyageKeys', () => {
    it('should return empty array when no keys file exists', () => {
      const keys = keychainService.getVoyageKeys()
      expect(keys).toEqual([])
    })

    it('should return decrypted keys from file', () => {
      const keysPath = '/tmp/test-userdata/voyage-keys.enc'
      mockFs[keysPath] = Buffer.from('enc:["key-1","key-2"]')

      const keys = keychainService.getVoyageKeys()
      expect(keys).toEqual(['key-1', 'key-2'])
    })

    it('should return empty when encryption not available', () => {
      vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(false)
      const keysPath = '/tmp/test-userdata/voyage-keys.enc'
      mockFs[keysPath] = Buffer.from('data')

      const keys = keychainService.getVoyageKeys()
      expect(keys).toEqual([])
    })
  })

  describe('addVoyageKey', () => {
    it('should add key and write encrypted file', () => {
      keychainService.addVoyageKey('new-api-key')
      const keysPath = '/tmp/test-userdata/voyage-keys.enc'
      expect(keysPath in mockFs).toBe(true)

      const keys = keychainService.getVoyageKeys()
      expect(keys).toContain('new-api-key')
    })

    it('should append to existing keys', () => {
      const keysPath = '/tmp/test-userdata/voyage-keys.enc'
      mockFs[keysPath] = Buffer.from('enc:["existing-key"]')

      keychainService.addVoyageKey('second-key')
      const keys = keychainService.getVoyageKeys()
      expect(keys).toEqual(['existing-key', 'second-key'])
    })
  })

  describe('removeVoyageKey', () => {
    it('should remove key at index and rewrite file', () => {
      const keysPath = '/tmp/test-userdata/voyage-keys.enc'
      mockFs[keysPath] = Buffer.from('enc:["key-a","key-b","key-c"]')

      keychainService.removeVoyageKey(1)
      const keys = keychainService.getVoyageKeys()
      expect(keys).toEqual(['key-a', 'key-c'])
    })

    it('should delete file when last key removed', () => {
      const keysPath = '/tmp/test-userdata/voyage-keys.enc'
      mockFs[keysPath] = Buffer.from('enc:["only-key"]')

      keychainService.removeVoyageKey(0)
      expect(keysPath in mockFs).toBe(false)
    })

    it('should throw for invalid index', () => {
      const keysPath = '/tmp/test-userdata/voyage-keys.enc'
      mockFs[keysPath] = Buffer.from('enc:["key"]')

      expect(() => keychainService.removeVoyageKey(5)).toThrow('Invalid key index')
      expect(() => keychainService.removeVoyageKey(-1)).toThrow('Invalid key index')
    })
  })

  describe('getMaskedKeys', () => {
    it('should return masked version of stored keys', () => {
      const keysPath = '/tmp/test-userdata/voyage-keys.enc'
      mockFs[keysPath] = Buffer.from('enc:["sk-1234567890abcdef"]')

      const masked = keychainService.getMaskedKeys()
      expect(masked).toHaveLength(1)
      expect(masked[0].index).toBe(0)
      expect(masked[0].masked).toBe('sk-...cdef')
    })

    it('should mask short keys with asterisks', () => {
      const keysPath = '/tmp/test-userdata/voyage-keys.enc'
      mockFs[keysPath] = Buffer.from('enc:["short"]')

      const masked = keychainService.getMaskedKeys()
      expect(masked[0].masked).toBe('********')
    })
  })
})
