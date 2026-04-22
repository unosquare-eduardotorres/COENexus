import { useCallback, useEffect, useState } from 'react'
import { createRendererLogger } from '../../../../shared/utils/rendererLogger'
import { reportError } from '../../../../shared/utils/reportError'
import BraniacPatternList from '../../components/braniac/BraniacPatternList'
import { braniacService } from '../../services/braniacService'
import type { BraniacPattern } from '../../../../../shared/ipc-types'

const log = createRendererLogger('BraniacPatternsTab')

export default function PatternsTab() {
  const [patterns, setPatterns] = useState<BraniacPattern[]>([])
  const [error, setError] = useState<string | null>(null)

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

  return (
    <div className="space-y-4">
      {error && (
        <div className="glass-panel p-3 rounded-xl bg-red-50/50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
      <BraniacPatternList
        patterns={patterns}
        onApprove={handleApprove}
        onReject={handleReject}
        onUpdate={handleUpdate}
      />
    </div>
  )
}
