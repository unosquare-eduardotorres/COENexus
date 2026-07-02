import { useMemo } from 'react'
import { formatDate } from '../../utils/dateFormatters'

interface Discussion {
  commentId: number
  parentCommentId: number | null
  author: string
  date: string
  message: string
}

interface PositionDiscussionSectionProps {
  discussions: Discussion[]
}

export default function PositionDiscussionSection({ discussions }: PositionDiscussionSectionProps) {
  const groupedDiscussions = useMemo(() => {
    if (discussions.length === 0) return []
    const rootCommentIds = new Set(discussions.map(d => d.commentId))
    const roots = discussions.filter(d => !d.parentCommentId || !rootCommentIds.has(d.parentCommentId))
    const replyPool = discussions.filter(d => d.parentCommentId && rootCommentIds.has(d.parentCommentId) && roots.every(r => r.commentId !== d.commentId))

    const threads = roots.map(root => ({
      root,
      replies: replyPool
        .filter(d => d.parentCommentId === root.commentId)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    }))

    const getLatestDate = (thread: typeof threads[number]) => {
      const dates = [new Date(thread.root.date).getTime(), ...thread.replies.map(r => new Date(r.date).getTime())]
      return Math.max(...dates)
    }

    return threads.sort((a, b) => getLatestDate(b) - getLatestDate(a))
  }, [discussions])

  const newestCommentId = useMemo(() => {
    if (discussions.length === 0) return null
    let newest = discussions[0]
    for (const d of discussions) {
      if (new Date(d.date).getTime() > new Date(newest.date).getTime()) newest = d
    }
    return newest.commentId
  }, [discussions])

  const newestThreadRootId = useMemo(() => {
    if (!newestCommentId || groupedDiscussions.length === 0) return null
    for (const thread of groupedDiscussions) {
      if (thread.root.commentId === newestCommentId) return thread.root.commentId
      if (thread.replies.some(r => r.commentId === newestCommentId)) return thread.root.commentId
    }
    return null
  }, [newestCommentId, groupedDiscussions])

  return (
    <div className="glass-panel p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-primary uppercase tracking-wide">Discussion</h2>
        <span className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 text-[10px] font-semibold">
          {discussions.length} comment{discussions.length !== 1 ? 's' : ''}
        </span>
      </div>
      {discussions.length === 0 ? (
        <p className="text-sm text-muted text-center py-6">No discussion comments yet.</p>
      ) : (
        <div className="space-y-0">
          {groupedDiscussions.map((thread, idx) => {
            const isNewestThread = thread.root.commentId === newestThreadRootId

            return (
              <div key={thread.root.commentId} className={isNewestThread ? 'relative' : ''}>
                {isNewestThread && (
                  <div className="absolute -left-3 top-0 bottom-0 w-0.5 bg-blue-500 rounded-full" />
                )}

                <div className="flex gap-3 py-3">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center">
                    <span className="text-xs font-bold text-emerald-400">{thread.root.author.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-primary">{thread.root.author.split('@')[0]}</span>
                      <span className="text-xs text-muted font-mono">{formatDate(thread.root.date)}</span>
                      {thread.root.commentId === newestCommentId && (
                        <span className="px-1.5 py-0.5 text-[9px] rounded bg-blue-500/15 text-blue-400 font-semibold">Latest</span>
                      )}
                    </div>
                    <p className="text-sm text-secondary leading-relaxed">{thread.root.message}</p>
                  </div>
                </div>

                {thread.replies.length > 0 && (
                  <div className="ml-4 border-l-2 border-white/10 pl-4 space-y-0">
                    {thread.replies.map(reply => (
                      <div key={reply.commentId} className="flex gap-3 py-2.5">
                        <div className="shrink-0 w-6 h-6 rounded-full bg-white/5 flex items-center justify-center">
                          <span className="text-xs font-bold text-muted">{reply.author.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-medium text-secondary">{reply.author.split('@')[0]}</span>
                            <span className="text-xs text-muted font-mono">{formatDate(reply.date)}</span>
                            {reply.commentId === newestCommentId && (
                              <span className="px-1.5 py-0.5 text-[9px] rounded bg-blue-500/15 text-blue-400 font-semibold">Latest</span>
                            )}
                          </div>
                          <p className="text-sm text-secondary leading-relaxed">{reply.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {idx < groupedDiscussions.length - 1 && <div className="minimal-divider my-1" />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
