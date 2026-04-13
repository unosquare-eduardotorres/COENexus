import { useState, useEffect } from 'react'
import { X, Brain } from 'lucide-react'

interface BrainSnapshotViewerProps {
  onClose: () => void
}

export default function BrainSnapshotViewer({ onClose }: BrainSnapshotViewerProps) {
  const [snapshot, setSnapshot] = useState<{
    snapshot_markdown: string
    token_estimate: number
    created_at: string
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.api?.scout9?.getBrainSnapshot?.().then((result: { success: boolean; data?: unknown }) => {
      if (result?.success && result.data) {
        setSnapshot(result.data as typeof snapshot)
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-3xl max-h-[80vh] flex flex-col rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-white/10 dark:border-dark-border/30">
          <div className="flex items-center gap-2">
            <Brain size={16} className="text-violet-400" />
            <h3 className="text-sm font-semibold text-primary">Brain Snapshot</h3>
          </div>
          <button onClick={onClose} className="text-muted hover:text-primary transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && <p className="text-xs text-muted text-center py-8">Loading snapshot...</p>}
          {!loading && !snapshot && <p className="text-xs text-muted text-center py-8">No brain snapshot available yet. Run a pipeline first.</p>}
          {snapshot && (
            <>
              <div className="flex items-center gap-4">
                <div className="glass-panel-subtle px-3 py-2 rounded-lg">
                  <span className="text-[10px] text-muted">Tokens</span>
                  <p className="text-sm font-bold text-primary">{snapshot.token_estimate.toLocaleString()}</p>
                </div>
                <div className="glass-panel-subtle px-3 py-2 rounded-lg">
                  <span className="text-[10px] text-muted">Created</span>
                  <p className="text-xs font-medium text-secondary">{new Date(snapshot.created_at).toLocaleString()}</p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-primary mb-2">Assembled System Prompt</h4>
                <pre className="glass-panel-subtle p-3 rounded-lg text-[11px] font-mono text-secondary whitespace-pre-wrap break-words max-h-96 overflow-y-auto">
                  {snapshot.snapshot_markdown}
                </pre>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
