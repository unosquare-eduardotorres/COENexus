import { useCallback, useEffect, useState } from 'react'
import { createRendererLogger } from '../../../../shared/utils/rendererLogger'
import { reportError } from '../../../../shared/utils/reportError'
import BraniacJobHistory from '../../components/braniac/BraniacJobHistory'
import { braniacService } from '../../services/braniacService'
import type { BraniacJob } from '../../../../../shared/ipc-types'

const log = createRendererLogger('BraniacJobHistoryTab')

export default function JobHistoryTab() {
  const [jobs, setJobs] = useState<BraniacJob[]>([])
  const [error, setError] = useState<string | null>(null)

  const loadJobs = useCallback(async () => {
    try {
      const res = await braniacService.listJobs({ limit: 50 })
      if (res.success && res.data) setJobs(res.data)
    } catch (err) {
      setError(reportError(err))
      log.error('Failed to load jobs', { error: reportError(err) })
    }
  }, [])

  useEffect(() => {
    void loadJobs()
  }, [loadJobs])

  useEffect(() => {
    const cleanup = braniacService.onStatusEvent((event) => {
      if (event.status === 'completed' || event.status === 'failed') void loadJobs()
    })
    return cleanup
  }, [loadJobs])

  return (
    <div className="space-y-4">
      {error && (
        <div className="glass-panel p-3 rounded-xl bg-red-50/50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
      <BraniacJobHistory jobs={jobs} />
    </div>
  )
}
