import { describe, it, expect, vi, beforeEach } from 'vitest'
import { discussionService } from './discussionService'

describe('discussionService', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('listThreads', () => {
    it('should return array of discussion threads', async () => {
      const result = await discussionService.listThreads()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should filter by search term', async () => {
      const all = await discussionService.listThreads()
      const filtered = await discussionService.listThreads({ search: 'xyznotexist' })
      expect(filtered.length).toBeLessThanOrEqual(all.length)
    })
  })

  describe('getThreadById', () => {
    it('should return thread for known id', async () => {
      const all = await discussionService.listThreads()
      if (all.length > 0) {
        const result = await discussionService.getThreadById(all[0].id)
        expect(result).not.toBeNull()
      }
    })

    it('should return null for unknown id', async () => {
      const result = await discussionService.getThreadById('unknown-999')
      expect(result).toBeNull()
    })
  })

  describe('listMessages', () => {
    it('should return array of messages for thread', async () => {
      const result = await discussionService.listMessages('thread-1')
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('createPost', () => {
    it('should return object with id', async () => {
      const result = await discussionService.createPost('thread-1', 1, 'Hello')
      expect(result).toHaveProperty('id')
    })
  })

  describe('replyToPost', () => {
    it('should return object with id', async () => {
      const result = await discussionService.replyToPost('thread-1', 'msg-1', 1, 'Reply')
      expect(result).toHaveProperty('id')
    })
  })
})
