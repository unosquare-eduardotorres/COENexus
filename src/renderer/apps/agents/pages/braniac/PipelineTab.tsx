import { useCallback, useEffect, useRef, useState } from 'react'
import { createRendererLogger } from '../../../../shared/utils/rendererLogger'
import { reportError } from '../../../../shared/utils/reportError'
import AgentStepStream from '../../components/AgentStepStream'
import BraniacRunCard from '../../components/braniac/BraniacRunCard'
import StakeholderProfileCards from '../../components/braniac/StakeholderProfileCards'
import { braniacService } from '../../services/braniacService'
import type { BraniacStakeholderProfile } from '../../../../../shared/ipc-types'

const log = createRendererLogger('BraniacPipelineTab')

export default function PipelineTab() {
  const [accounts, setAccounts] = useState<string[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const [profiles, setProfiles] = useState<BraniacStakeholderProfile[]>([])
  const [error, setError] = useState<string | null>(null)
  const [batchProgress, setBatchProgress] = useState<{
    current: number; total: number; currentAccount: string
  } | null>(null)
  const batchCancelledRef = useRef(false)

  const loadData = useCallback(async () => {
    try {
      const [accountsRes, statusRes, profilesRes] = await Promise.all([
        braniacService.getAccounts(),
        braniacService.getStatus(),
        braniacService.listProfiles(),
      ])

      if (accountsRes.success && accountsRes.data) setAccounts(accountsRes.data)
      if (statusRes.success && statusRes.data) {
        setIsRunning(statusRes.data.running)
        setCurrentJobId(statusRes.data.job_id)
      }
      if (profilesRes.success && profilesRes.data) setProfiles(profilesRes.data)
    } catch (err) {
      const errorMsg = reportError(err)
      log.error('Failed to load pipeline data', { error: errorMsg })
      setError(errorMsg)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    const cleanupStatus = braniacService.onStatusEvent((event) => {
      setIsRunning(event.status === 'running')
      setCurrentJobId(event.job_id)

      if (event.status === 'completed' || event.status === 'failed') {
        void loadData()
      }
    })

    return cleanupStatus
  }, [loadData])

  const handleRun = useCallback(async (account: string, scope: 'account' | 'stakeholder') => {
    setError(null)
    try {
      const result = await braniacService.run({ scope, account })
      if (result.success && result.data) {
        setIsRunning(true)
        setCurrentJobId(result.data.id)
      } else if (result.error) {
        setError(result.error)
      }
    } catch (err) {
      const errorMsg = reportError(err)
      setError(errorMsg)
      log.error('Failed to run Braniac', { error: errorMsg })
    }
  }, [])

  const handleCancel = useCallback(async (jobId: string) => {
    try {
      await braniacService.cancel({ job_id: jobId })
      setIsRunning(false)
      setCurrentJobId(null)
    } catch (err) {
      const errorMsg = reportError(err)
      log.error('Failed to cancel Braniac', { error: errorMsg })
    }
  }, [])

  const handleRunAll = useCallback(async () => {
    if (accounts.length === 0) return
    batchCancelledRef.current = false
    setError(null)

    for (let i = 0; i < accounts.length; i++) {
      if (batchCancelledRef.current) break
      const account = accounts[i]
      setBatchProgress({ current: i + 1, total: accounts.length, currentAccount: account })

      try {
        const result = await braniacService.run({ scope: 'account', account })
        if (result.success && result.data) {
          setIsRunning(true)
          setCurrentJobId(result.data.id)

          await new Promise<void>((resolve) => {
            const cleanup = braniacService.onStatusEvent((event) => {
              if (event.status === 'completed' || event.status === 'failed') {
                cleanup()
                resolve()
              }
            })
          })
        }
      } catch (err) {
        log.error('Batch run failed for account', { account, error: reportError(err) })
      }
    }

    setBatchProgress(null)
    setIsRunning(false)
    void loadData()
  }, [accounts, loadData])

  const handleCancelBatch = useCallback(() => {
    batchCancelledRef.current = true
    if (currentJobId) void handleCancel(currentJobId)
    setBatchProgress(null)
  }, [currentJobId, handleCancel])

  return (
    <div className="space-y-4">
      {error && (
        <div className="glass-panel p-3 rounded-xl bg-red-50/50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <BraniacRunCard
        accounts={accounts}
        isRunning={isRunning}
        currentJobId={currentJobId}
        batchProgress={batchProgress}
        onRun={handleRun}
        onRunAll={handleRunAll}
        onCancel={handleCancel}
        onCancelBatch={handleCancelBatch}
      />

      {isRunning && (
        <AgentStepStream agentId="braniac" agentName="Braniac" maxBubbles={8} />
      )}

      <StakeholderProfileCards profiles={profiles} />
    </div>
  )
}
