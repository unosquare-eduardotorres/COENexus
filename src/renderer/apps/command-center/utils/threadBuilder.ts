import type { ResponsivenessDiscussionComment, ResponsivenessMentionItem } from '../../../../shared/ipc-types'

// ── Types ──────────────────────────────────────────────────

export interface MentionAnnotation {
  taggedLeadName: string
  taggedLeadEmail: string
  responded: boolean
}

export interface AnnotatedComment {
  commentId: number
  author: string
  authorName: string
  date: string
  message: string
  parentCommentId: number | null
  mentions: MentionAnnotation[]
}

export interface AnnotatedThread {
  root: AnnotatedComment
  replies: AnnotatedComment[]
  unansweredCount: number
  hasAnyMention: boolean
}

// ── Builder ────────────────────────────────────────────────

export function buildAnnotatedThreads(
  discussions: ResponsivenessDiscussionComment[],
  mentionItems: ResponsivenessMentionItem[],
): AnnotatedThread[] {
  if (discussions.length === 0) return []

  // Index mentions by commentId for fast lookup
  const mentionsByCommentId = new Map<number, MentionAnnotation[]>()
  for (const m of mentionItems) {
    const arr = mentionsByCommentId.get(m.mentionCommentId) || []
    arr.push({
      taggedLeadName: m.taggedLeadName,
      taggedLeadEmail: m.taggedLeadEmail,
      responded: m.responded,
    })
    mentionsByCommentId.set(m.mentionCommentId, arr)
  }

  // Build annotated comments
  const annotated: AnnotatedComment[] = discussions.map(d => ({
    commentId: d.commentId,
    author: d.author,
    authorName: d.author.split('@')[0]?.replace(/[._-]/g, ' ').trim() || d.author,
    date: d.date,
    message: d.message,
    parentCommentId: d.parentCommentId,
    mentions: mentionsByCommentId.get(d.commentId) || [],
  }))

  // Group into threads: roots are comments with no parent or whose parent is not in the set
  const commentIds = new Set(annotated.map(c => c.commentId))
  const roots = annotated.filter(c => !c.parentCommentId || !commentIds.has(c.parentCommentId))
  const replyPool = annotated.filter(c =>
    c.parentCommentId && commentIds.has(c.parentCommentId) && roots.every(r => r.commentId !== c.commentId)
  )

  const threads: AnnotatedThread[] = roots
    .map(root => {
      const replies = replyPool
        .filter(r => r.parentCommentId === root.commentId)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      const allComments = [root, ...replies]
      const unansweredCount = allComments.reduce(
        (sum, c) => sum + c.mentions.filter(m => !m.responded).length, 0
      )
      const hasAnyMention = allComments.some(c => c.mentions.length > 0)

      return { root, replies, unansweredCount, hasAnyMention }
    })
    // Only show threads containing at least one mention
    .filter(t => t.hasAnyMention)
    // Sort: most unanswered first, then by newest date
    .sort((a, b) =>
      b.unansweredCount - a.unansweredCount ||
      new Date(b.root.date).getTime() - new Date(a.root.date).getTime()
    )

  return threads
}
