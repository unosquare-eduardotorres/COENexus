import { describe, it, expect, beforeEach } from 'vitest'
import { matchSearchCoordinator } from '../matchSearchCoordinator'

describe('matchSearchCoordinator', () => {
  beforeEach(() => {
    matchSearchCoordinator.tryResolveAll('cancel')
  })

  describe('register', () => {
    it('should return a promise that resolves when tryResolve is called', async () => {
      const promise = matchSearchCoordinator.register('search-1')
      const resolved = matchSearchCoordinator.tryResolve('search-1', 'proceed')

      expect(resolved).toBe(true)
      await expect(promise).resolves.toBe('proceed')
    })

    it('should handle multiple concurrent registrations', async () => {
      const promise1 = matchSearchCoordinator.register('search-1')
      const promise2 = matchSearchCoordinator.register('search-2')

      matchSearchCoordinator.tryResolve('search-1', 'proceed')
      matchSearchCoordinator.tryResolve('search-2', 'cancel')

      await expect(promise1).resolves.toBe('proceed')
      await expect(promise2).resolves.toBe('cancel')
    })
  })

  describe('tryResolve', () => {
    it('should return false for non-existent search id', () => {
      const result = matchSearchCoordinator.tryResolve('nonexistent', 'proceed')
      expect(result).toBe(false)
    })

    it('should return true and resolve the pending promise', async () => {
      const promise = matchSearchCoordinator.register('search-1')
      const result = matchSearchCoordinator.tryResolve('search-1', 'proceed')

      expect(result).toBe(true)
      await expect(promise).resolves.toBe('proceed')
    })

    it('should return false on second resolve of same id', async () => {
      const promise = matchSearchCoordinator.register('search-1')
      matchSearchCoordinator.tryResolve('search-1', 'proceed')
      await promise

      const result = matchSearchCoordinator.tryResolve('search-1', 'proceed')
      expect(result).toBe(false)
    })
  })

  describe('tryResolveAll', () => {
    it('should resolve all pending registrations', async () => {
      const promise1 = matchSearchCoordinator.register('search-1')
      const promise2 = matchSearchCoordinator.register('search-2')

      matchSearchCoordinator.tryResolveAll('cancel')

      await expect(promise1).resolves.toBe('cancel')
      await expect(promise2).resolves.toBe('cancel')
    })

    it('should handle empty pending map without error', () => {
      expect(() => matchSearchCoordinator.tryResolveAll('cancel')).not.toThrow()
    })
  })
})
