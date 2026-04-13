import { getPathDatabase } from '../pathConnection'
import { createLogger } from '../../../services/logger'

const log = createLogger('PathDiscussionRepository')

export interface PathDiscussionThreadSummaryRow {
  id: number
  learning_path_id: number
  title: string
  status: string
  created_by: number
  reply_count: number
  last_activity_at: string
}

export interface PathDiscussionPostRow {
  id: number
  author_id: number
  message: string
  created_at: string
  parent_post_id: number | null
}

export interface ListDiscussionThreadsParams {
  search?: string
  page?: number
  pageSize?: number
}

function normalizePaging(params: ListDiscussionThreadsParams): { limit: number; offset: number } {
  const pageSize = Math.min(Math.max(params.pageSize ?? 20, 1), 200)
  const page = Math.max(params.page ?? 1, 1)
  return { limit: pageSize, offset: (page - 1) * pageSize }
}

export const discussionRepository = {
  listThreads(params: ListDiscussionThreadsParams): PathDiscussionThreadSummaryRow[] {
    const db = getPathDatabase()
    const { limit, offset } = normalizePaging(params)
    const pattern = `%${params.search?.trim() ?? ''}%`
    return db.prepare(`
      SELECT
        dt.id,
        COALESCE(CAST(dt.context_id AS INTEGER), 0) AS learning_path_id,
        dt.title,
        dt.status,
        COALESCE(CAST(dt.author_id AS INTEGER), 0) AS created_by,
        (
          SELECT COUNT(*)
          FROM thread_comments tc
          WHERE tc.thread_id = dt.id
        ) AS reply_count,
        COALESCE((
          SELECT MAX(tc.updated_at)
          FROM thread_comments tc
          WHERE tc.thread_id = dt.id
        ), dt.updated_at) AS last_activity_at
      FROM discussion_threads dt
      WHERE (? = '%%' OR dt.title LIKE ?)
      ORDER BY last_activity_at DESC
      LIMIT ? OFFSET ?
    `).all(pattern, pattern, limit, offset) as PathDiscussionThreadSummaryRow[]
  },

  getThreadById(id: number): PathDiscussionThreadSummaryRow | undefined {
    const db = getPathDatabase()
    return db.prepare(`
      SELECT
        dt.id,
        COALESCE(CAST(dt.context_id AS INTEGER), 0) AS learning_path_id,
        dt.title,
        dt.status,
        COALESCE(CAST(dt.author_id AS INTEGER), 0) AS created_by,
        (
          SELECT COUNT(*)
          FROM thread_comments tc
          WHERE tc.thread_id = dt.id
        ) AS reply_count,
        COALESCE((
          SELECT MAX(tc.updated_at)
          FROM thread_comments tc
          WHERE tc.thread_id = dt.id
        ), dt.updated_at) AS last_activity_at
      FROM discussion_threads dt
      WHERE dt.id = ?
    `).get(id) as PathDiscussionThreadSummaryRow | undefined
  },

  listPosts(threadId: number): PathDiscussionPostRow[] {
    const db = getPathDatabase()
    return db.prepare(`
      SELECT
        tc.id,
        COALESCE(CAST(tc.author_id AS INTEGER), 0) AS author_id,
        tc.body AS message,
        tc.created_at,
        tc.parent_comment_id AS parent_post_id
      FROM thread_comments tc
      WHERE tc.thread_id = ?
      ORDER BY tc.created_at ASC, tc.id ASC
    `).all(threadId) as PathDiscussionPostRow[]
  },

  createPost(threadId: number, authorId: number, message: string, parentPostId: number | null): number {
    const db = getPathDatabase()
    try {
      const result = db.prepare(`
        INSERT INTO thread_comments (
          thread_id, parent_comment_id, author_id, body, is_edited, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 0, datetime('now'), datetime('now'))
      `).run(threadId, parentPostId, String(authorId), message)

      db.prepare('UPDATE discussion_threads SET updated_at = datetime(\'now\') WHERE id = ?').run(threadId)
      return Number(result.lastInsertRowid)
    } catch (err) {
      log.error('createPost failed', err instanceof Error ? err : new Error(String(err)), { threadId, authorId })
      throw err
    }
  },
}
