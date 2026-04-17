import { useState, useEffect } from 'react'
import type { PresentationSessionSummary } from '../../types'
import { presentationService } from '../../services/presentationService'

interface PresentationHistoryProps {
  onSelectSession: (sessionId: number) => void
}

export default function PresentationHistory({ onSelectSession }: PresentationHistoryProps) {
  const [sessions, setSessions] = useState<PresentationSessionSummary[]>([])
  const [loading, setLoading] = useState(true)

  const loadSessions = () => {
    setLoading(true)
    presentationService.listSessions()
      .then(setSessions)
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadSessions() }, [])

  const handleDelete = async (id: number) => {
    await presentationService.deleteSession(id)
    loadSessions()
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-5 h-5 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center text-muted py-8 text-sm">
        No past presentations found.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {sessions.map(session => (
        <div key={session.id} className="glass-card-hover p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-primary">
                {session.name || session.positionTitle || 'Untitled Presentation'}
              </h4>
              <div className="text-xs text-muted mt-1">
                {session.accountName && <span>{session.accountName} · </span>}
                <span>{session.entryCount} candidate{session.entryCount !== 1 ? 's' : ''}</span>
                <span className="mx-1">·</span>
                <span>{session.mode}</span>
                <span className="mx-1">·</span>
                <span>{new Date(session.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${session.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-dark-muted dark:text-gray-400'}`}>
                {session.status}
              </span>
              <button
                onClick={() => onSelectSession(session.id)}
                className="text-xs text-accent-600 dark:text-accent-400 hover:underline"
              >
                Open
              </button>
              <button
                onClick={() => handleDelete(session.id)}
                className="text-xs text-red-500 hover:underline"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
