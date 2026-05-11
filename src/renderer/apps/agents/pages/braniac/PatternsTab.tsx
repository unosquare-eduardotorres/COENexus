import { useCallback, useEffect, useState } from 'react'
import { createRendererLogger } from '../../../../shared/utils/rendererLogger'
import { reportError } from '../../../../shared/utils/reportError'
import AddPatternForm from '../../components/braniac/AddPatternForm'
import BraniacPatternList from '../../components/braniac/BraniacPatternList'
import ConfirmDeleteModal from '../../components/braniac/ConfirmDeleteModal'
import { braniacService } from '../../services/braniacService'
import type { BraniacPattern } from '../../../../../shared/ipc-types'

const log = createRendererLogger('BraniacPatternsTab')

export default function PatternsTab() {
  const [patterns, setPatterns] = useState<BraniacPattern[]>([])
  const [error, setError] = useState<string | null>(null)
  const [patternToDelete, setPatternToDelete] = useState<BraniacPattern | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadPatterns = useCallback(async () => {
    try {
      const res = await braniacService.listPatterns()
      if (res.success && res.data) setPatterns(res.data)
    } catch (err) {
      setError(reportError(err))
      log.error('Failed to load patterns', { error: reportError(err) })
    }
  }, [])

  useEffect(() => {
    void loadPatterns()
  }, [loadPatterns])

  useEffect(() => {
    const cleanup = braniacService.onStatusEvent((event) => {
      if (event.status === 'completed') void loadPatterns()
    })
    return cleanup
  }, [loadPatterns])

  const handleApprove = useCallback(async (id: string) => {
    try {
      await braniacService.approvePattern({ id })
      void loadPatterns()
    } catch (err) {
      setError(reportError(err))
      log.error('Failed to approve pattern')
    }
  }, [loadPatterns])

  const handleReject = useCallback(async (id: string, reason?: string) => {
    try {
      await braniacService.rejectPattern({ id, reason })
      void loadPatterns()
    } catch (err) {
      setError(reportError(err))
      log.error('Failed to reject pattern')
    }
  }, [loadPatterns])

  const handleUpdate = useCallback(async (id: string, updates: { pattern_text?: string; confidence_score?: number }) => {
    try {
      await braniacService.updatePattern({ id, ...updates })
      void loadPatterns()
    } catch (err) {
      setError(reportError(err))
      log.error('Failed to update pattern')
    }
  }, [loadPatterns])

  const handleRequestDelete = useCallback((pattern: BraniacPattern) => {
    setPatternToDelete(pattern)
  }, [])

  const handleConfirmDelete = useCallback(async () => {
    if (!patternToDelete) return
    try {
      setIsDeleting(true)
      const res = await braniacService.deletePattern({ id: patternToDelete.id })
      if (res.success) {
        setPatternToDelete(null)
        void loadPatterns()
      } else {
        setError(res.error ?? 'Failed to delete pattern')
      }
    } catch (err) {
      setError(reportError(err))
      log.error('Failed to delete pattern')
    } finally {
      setIsDeleting(false)
    }
  }, [patternToDelete, loadPatterns])

  return (
    <div className="space-y-4">
      {error && (
        <div className="glass-panel p-3 rounded-xl bg-red-50/50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
      <AddPatternForm onPatternCreated={() => void loadPatterns()} />

      <BraniacPatternList
        patterns={patterns}
        onApprove={handleApprove}
        onReject={handleReject}
        onUpdate={handleUpdate}
        onDelete={handleRequestDelete}
      />

      {patternToDelete && (
        <ConfirmDeleteModal
          title={`Delete "${patternToDelete.pattern_name}"?`}
          description="This permanently deletes the pattern. It cannot be undone."
          impactSummary={[
            patternToDelete.stakeholder
              ? `Scope: ${patternToDelete.account} / ${patternToDelete.stakeholder}`
              : patternToDelete.account
                ? `Scope: ${patternToDelete.account} (account-wide)`
                : 'Scope: global',
            `Source: ${patternToDelete.source_agent}`,
          ]}
          confirmLabel="Delete Pattern"
          busy={isDeleting}
          onConfirm={handleConfirmDelete}
          onClose={() => setPatternToDelete(null)}
        />
      )}
    </div>
  )
}
