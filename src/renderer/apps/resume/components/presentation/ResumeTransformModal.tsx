import { useState, useEffect } from 'react'
import type { SelectedPerson } from '../../types'
import { presentationService } from '../../services/presentationService'

interface ResumeTransformModalProps {
  person: SelectedPerson
  resumeText: string
  jobDescription?: string
  onComplete: (transformedText: string) => void
  onClose: () => void
}

export default function ResumeTransformModal({
  person, resumeText, jobDescription, onComplete, onClose,
}: ResumeTransformModalProps) {
  const [status, setStatus] = useState<'transforming' | 'done' | 'error'>('transforming')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setStatus('transforming')
    presentationService.transformResume({
      resumeText,
      fullName: person.fullName,
      jobDescription,
    }).then(result => {
      if (!cancelled) {
        setStatus('done')
        onComplete(result.transformedResumeText)
      }
    }).catch(err => {
      if (!cancelled) {
        setStatus('error')
        setError(err.message || 'Transform failed')
      }
    })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="glass-panel w-full max-w-md p-6 space-y-4">
        <h3 className="text-lg font-semibold text-primary">Transforming Resume</h3>
        <p className="text-sm text-muted">{person.fullName}</p>

        {status === 'transforming' && (
          <div className="flex items-center gap-3 py-4">
            <div className="w-6 h-6 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-secondary">Applying Unosquare format...</span>
          </div>
        )}

        {status === 'done' && (
          <div className="py-4">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium">Transform complete</span>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="py-4">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="flex justify-end">
          <button onClick={onClose} className="glass-button px-4 py-2 text-sm">
            {status === 'transforming' ? 'Cancel' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  )
}
