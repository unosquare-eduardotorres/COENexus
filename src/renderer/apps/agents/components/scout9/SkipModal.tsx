import { useState } from 'react'
import { X } from 'lucide-react'

interface SkipModalProps {
  candidateId: string
  candidateName: string
  onSubmit: (data: { reason: string; submitAsLesson: boolean; scope: string }) => void
  onClose: () => void
}

export default function SkipModal({ candidateId, candidateName, onSubmit, onClose }: SkipModalProps) {
  const [reason, setReason] = useState('')
  const [submitAsLesson, setSubmitAsLesson] = useState(true)
  const [scope, setScope] = useState('stakeholder')

  function handleSubmit() {
    if (!reason.trim()) return
    onSubmit({ reason: reason.trim(), submitAsLesson, scope })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-md p-6 space-y-4 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-primary">Skip Candidate</h3>
          <button onClick={onClose} className="text-muted hover:text-primary transition-colors">
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-secondary">
          Skipping <span className="font-semibold text-primary">{candidateName}</span>
        </p>

        <div>
          <label className="text-[10px] text-muted uppercase tracking-wider">Reason</label>
          <textarea
            className="glass-input w-full mt-1 px-3 py-2 text-xs min-h-[80px] resize-none"
            placeholder="Why is this candidate not a good fit?"
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={submitAsLesson}
            onChange={e => setSubmitAsLesson(e.target.checked)}
            className="rounded border-gray-300 dark:border-gray-600 text-blue-500"
          />
          <span className="text-xs text-secondary">Submit as learned pattern</span>
        </label>

        {submitAsLesson && (
          <div className="space-y-1.5">
            <label className="text-[10px] text-muted uppercase tracking-wider">Pattern Scope</label>
            <div className="flex flex-col gap-1.5">
              {[
                { value: 'stakeholder', label: 'This stakeholder only' },
                { value: 'client', label: 'This client' },
                { value: 'universal', label: 'Universal' },
              ].map(opt => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="scope"
                    value={opt.value}
                    checked={scope === opt.value}
                    onChange={() => setScope(opt.value)}
                    className="text-blue-500"
                  />
                  <span className="text-xs text-secondary">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="glass-button px-3 py-1.5 text-xs font-medium text-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!reason.trim()}
            className="glass-button px-3 py-1.5 text-xs font-semibold bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition-colors disabled:opacity-50"
          >
            Skip Candidate
          </button>
        </div>
      </div>
    </div>
  )
}
