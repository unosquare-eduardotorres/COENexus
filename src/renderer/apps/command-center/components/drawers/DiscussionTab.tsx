import { useMemo } from 'react'
import { formatDate } from '../../utils/dateFormatters'

interface Discussion {
  commentId: number
  parentCommentId: number | null
  author: string
  date: string
  message: string
}

interface DiscussionTabProps {
  discussions: Discussion[]
}

export default function DiscussionTab({ discussions }: DiscussionTabProps) {
  const groupedDiscussions = useMemo(() => {
    if (discussions.length === 0) return []
    const rootCommentIds = new Set(discussions.map(d => d.commentId))
    const roots = discussions.filter(d => !d.parentCommentId || !rootCommentIds.has(d.parentCommentId))
    const replyPool = discussions.filter(d => d.parentCommentId && rootCommentIds.has(d.parentCommentId) && roots.every(r => r.commentId !== d.commentId))
    return roots
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(root => ({
        root,
        replies: replyPool
          .filter(d => d.parentCommentId === root.commentId)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      }))
  }, [discussions])

  if (discussions.length === 0) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-sm text-muted">No discussion comments yet</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="space-y-0">
        {groupedDiscussions.map((thread, idx) => (
          <div key={thread.root.commentId}>
            <div className="flex gap-3 py-3">
              <div className="shrink-0 w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center">
                <span className="text-xs font-bold text-emerald-400">
                  {thread.root.author.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-primary">
                    {thread.root.author.split('@')[0]}
                  </span>
                  <span className="text-xs text-muted font-mono">
                    {formatDate(thread.root.date)}
                  </span>
                </div>
                <p className="text-sm text-secondary leading-relaxed">{thread.root.message}</p>
              </div>
            </div>

            {thread.replies.length > 0 && (
              <div className="ml-4 border-l-2 border-white/10 pl-4 space-y-0">
                {thread.replies.map(reply => (
                  <div key={reply.commentId} className="flex gap-3 py-2.5">
                    <div className="shrink-0 w-6 h-6 rounded-full bg-white/5 flex items-center justify-center">
                      <span className="text-xs font-bold text-muted">
                        {reply.author.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-medium text-secondary">
                          {reply.author.split('@')[0]}
                        </span>
                        <span className="text-xs text-muted font-mono">
                          {formatDate(reply.date)}
                        </span>
                      </div>
                      <p className="text-sm text-secondary leading-relaxed">{reply.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {idx < groupedDiscussions.length - 1 && <div className="minimal-divider my-1" />}
          </div>
        ))}
      </div>
    </div>
  )
}
