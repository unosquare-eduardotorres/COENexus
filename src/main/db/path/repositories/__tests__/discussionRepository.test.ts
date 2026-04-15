import Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PATH_SCHEMA } from './testPathSchema'
import { discussionRepository } from '../discussionRepository'

let testDb: Database.Database

vi.mock('../../pathConnection', () => ({
  getPathDatabase: () => testDb,
}))

vi.mock('../../../../services/logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

function seedThread(title: string, authorId = '1', status = 'open'): number {
  const result = testDb.prepare(`
    INSERT INTO discussion_threads (thread_key, title, context_type, context_id, author_id, status, created_at, updated_at)
    VALUES (?, ?, 'path', '1', ?, ?, datetime('now'), datetime('now'))
  `).run(`thread-${Date.now()}-${Math.random()}`, title, authorId, status)
  return Number(result.lastInsertRowid)
}

function seedComment(threadId: number, authorId = '1', body = 'A comment', parentCommentId: number | null = null): number {
  const result = testDb.prepare(`
    INSERT INTO thread_comments (thread_id, parent_comment_id, author_id, body, is_edited, created_at, updated_at)
    VALUES (?, ?, ?, ?, 0, datetime('now'), datetime('now'))
  `).run(threadId, parentCommentId, authorId, body)
  return Number(result.lastInsertRowid)
}

describe('discussionRepository', () => {
  beforeEach(() => {
    testDb = new Database(':memory:')
    testDb.exec(PATH_SCHEMA)
  })

  afterEach(() => {
    testDb.close()
  })

  describe('listThreads', () => {
    it('should return empty array when no threads exist', () => {
      const result = discussionRepository.listThreads({})
      expect(result).toEqual([])
    })

    it('should return threads with reply_count aggregation', () => {
      const threadId = seedThread('Discussion A')
      seedComment(threadId)
      seedComment(threadId)

      const result = discussionRepository.listThreads({})
      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Discussion A')
      expect(result[0].reply_count).toBe(2)
    })

    it('should filter by search term', () => {
      seedThread('React Patterns')
      seedThread('Java Design')

      const result = discussionRepository.listThreads({ search: 'React' })
      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('React Patterns')
    })

    it('should paginate results', () => {
      for (let i = 0; i < 5; i++) {
        seedThread(`Thread ${i}`)
      }

      const page1 = discussionRepository.listThreads({ page: 1, pageSize: 2 })
      expect(page1).toHaveLength(2)
    })
  })

  describe('getThreadById', () => {
    it('should return existing thread with reply count', () => {
      const threadId = seedThread('My Thread')
      seedComment(threadId)

      const result = discussionRepository.getThreadById(threadId)
      expect(result).toBeDefined()
      expect(result?.title).toBe('My Thread')
      expect(result?.reply_count).toBe(1)
    })

    it('should return undefined for non-existent thread', () => {
      const result = discussionRepository.getThreadById(9999)
      expect(result).toBeUndefined()
    })
  })

  describe('listPosts', () => {
    it('should return comments ordered by created_at ASC', () => {
      const threadId = seedThread('Ordered Thread')
      seedComment(threadId, '1', 'First comment')
      seedComment(threadId, '2', 'Second comment')

      const posts = discussionRepository.listPosts(threadId)
      expect(posts).toHaveLength(2)
      expect(posts[0].message).toBe('First comment')
      expect(posts[1].message).toBe('Second comment')
    })

    it('should return empty for thread with no comments', () => {
      const threadId = seedThread('Empty Thread')
      const posts = discussionRepository.listPosts(threadId)
      expect(posts).toEqual([])
    })
  })

  describe('createPost', () => {
    it('should insert comment and update thread updated_at', () => {
      const threadId = seedThread('Post Thread')
      const beforeThread = testDb.prepare('SELECT updated_at FROM discussion_threads WHERE id = ?').get(threadId) as { updated_at: string }

      const postId = discussionRepository.createPost(threadId, 5, 'New comment', null)
      expect(postId).toBeGreaterThan(0)

      const posts = discussionRepository.listPosts(threadId)
      expect(posts).toHaveLength(1)
      expect(posts[0].message).toBe('New comment')
      expect(posts[0].author_id).toBe(5)
      expect(posts[0].parent_post_id).toBeNull()

      const afterThread = testDb.prepare('SELECT updated_at FROM discussion_threads WHERE id = ?').get(threadId) as { updated_at: string }
      expect(afterThread.updated_at).toBeDefined()
    })

    it('should support parent_comment_id for replies', () => {
      const threadId = seedThread('Reply Thread')
      const parentId = seedComment(threadId, '1', 'Parent')

      const replyId = discussionRepository.createPost(threadId, 2, 'Reply to parent', parentId)
      expect(replyId).toBeGreaterThan(0)

      const posts = discussionRepository.listPosts(threadId)
      const reply = posts.find(p => p.id === replyId)
      expect(reply?.parent_post_id).toBe(parentId)
    })
  })
})
