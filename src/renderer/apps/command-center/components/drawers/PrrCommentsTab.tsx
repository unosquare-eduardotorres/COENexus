import { useState, useMemo } from 'react'
import { formatDateTime, formatRelativeTime } from '../../utils/dateFormatters'

interface CoeComment {
  author: string
  text: string
  createdAt: string
}

interface PrrCommentsTabProps {
  comments: CoeComment[]
  onCommentAdded: (text: string) => Promise<void>
}

export default function PrrCommentsTab({ comments, onCommentAdded }: PrrCommentsTabProps) {
  const [commentText, setCommentText] = useState('')
  const [savingComment, setSavingComment] = useState(false)

  const orderedComments = useMemo(() => {
    return [...comments].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }, [comments])

  const handleAddComment = async () => {
    const text = commentText.trim()
    if (!text || savingComment) return
    setSavingComment(true)
    try {
      await onCommentAdded(text)
      setCommentText('')
    } finally {
      setSavingComment(false)
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="space-y-0">
        {orderedComments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-sm text-muted">No CoE comments yet</p>
          </div>
        ) : (
          orderedComments.map((comment, index) => (
            <div key={`${comment.author}-${comment.createdAt}-${index}`}>
              <div className="flex gap-3 py-3">
                <div className="shrink-0 w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center">
                  <span className="text-xs font-bold text-emerald-400">
                    {(comment.author || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-primary">{comment.author || 'Unknown'}</span>
                    <span className="text-xs text-muted font-mono" title={formatDateTime(comment.createdAt)}>
                      {formatRelativeTime(comment.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-secondary leading-relaxed whitespace-pre-wrap">{comment.text}</p>
                </div>
              </div>
              {index < orderedComments.length - 1 && <div className="minimal-divider my-1" />}
            </div>
          ))
        )}
      </div>

      <div className="glass-panel-subtle p-4">
        <p className="text-xs text-muted uppercase tracking-wide mb-2">Add CoE Comment</p>
        <textarea
          value={commentText}
          onChange={(event) => setCommentText(event.target.value)}
          placeholder="Write a comment..."
          className="glass-input w-full min-h-[100px] resize-y"
        />
        <div className="mt-3 flex justify-end">
          <button
            onClick={() => void handleAddComment()}
            disabled={savingComment || !commentText.trim()}
            className="px-4 py-2 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            type="button"
          >
            {savingComment ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
