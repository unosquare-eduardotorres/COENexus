import { useCallback, useEffect, useState } from 'react'
import { createRendererLogger } from '../../../shared/utils/rendererLogger'
import { reportError } from '../../../shared/utils/reportError'
import AgentBanner from '../components/AgentBanner'
import AgentStepStream from '../components/AgentStepStream'
import BraniacRunCard from '../components/braniac/BraniacRunCard'
import BraniacJobHistory from '../components/braniac/BraniacJobHistory'
import StakeholderProfileCards from '../components/braniac/StakeholderProfileCards'
import BraniacPatternList from '../components/braniac/BraniacPatternList'
import { braniacService } from '../services/braniacService'
import type {
  BraniacJob,
  BraniacPattern,
  BraniacStakeholderProfile,
} from '../../../../shared/ipc-types'

const log = createRendererLogger('BraniacPage')

export default function BraniacPage() {
  const [accounts, setAccounts] = useState<string[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const [jobs, setJobs] = useState<BraniacJob[]>([])
  const [patterns, setPatterns] = useState<BraniacPattern[]>([])
  const [profiles, setProfiles] = useState<BraniacStakeholderProfile[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    log.info('Braniac page viewed')
  }, [])

  const loadData = useCallback(async () => {
    try {
      const [accountsRes, statusRes, jobsRes, patternsRes, profilesRes] = await Promise.all([
        braniacService.getAccounts(),
        braniacService.getStatus(),
        braniacService.listJobs({ limit: 20 }),
        braniacService.listPatterns(),
        braniacService.listProfiles(),
      ])

      if (accountsRes.success && accountsRes.data) setAccounts(accountsRes.data)
      if (statusRes.success && statusRes.data) {
        setIsRunning(statusRes.data.running)
        setCurrentJobId(statusRes.data.job_id)
      }
      if (jobsRes.success && jobsRes.data) setJobs(jobsRes.data)
      if (patternsRes.success && patternsRes.data) setPatterns(patternsRes.data)
      if (profilesRes.success && profilesRes.data) setProfiles(profilesRes.data)
    } catch (err) {
      const errorMsg = reportError(err)
      log.error('Failed to load Braniac data', { error: errorMsg })
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

  const handleApprovePattern = useCallback(async (id: string) => {
    try {
      await braniacService.approvePattern({ id })
      void loadData()
    } catch (err) {
      const errorMsg = reportError(err)
      log.error('Failed to approve pattern', { error: errorMsg })
      setError(errorMsg)
    }
  }, [loadData])

  const handleRejectPattern = useCallback(async (id: string, reason?: string) => {
    try {
      await braniacService.rejectPattern({ id, reason })
      void loadData()
    } catch (err) {
      const errorMsg = reportError(err)
      log.error('Failed to reject pattern', { error: errorMsg })
      setError(errorMsg)
    }
  }, [loadData])

  const handleUpdatePattern = useCallback(async (id: string, updates: { pattern_text?: string; confidence_score?: number }) => {
    try {
      await braniacService.updatePattern({ id, ...updates })
      void loadData()
    } catch (err) {
      const errorMsg = reportError(err)
      log.error('Failed to update pattern', { error: errorMsg })
      setError(errorMsg)
    }
  }, [loadData])

  const pendingPatternCount = patterns.filter(p => p.approval_status === 'pending_review').length

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <AgentBanner agentId="braniac" agentName="Braniac" compact />
        {pendingPatternCount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
            {pendingPatternCount} pattern{pendingPatternCount !== 1 ? 's' : ''} pending review
          </span>
        )}
      </div>

      {error && (
        <div className="glass-panel p-3 rounded-xl bg-red-50/50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <BraniacRunCard
            accounts={accounts}
            isRunning={isRunning}
            currentJobId={currentJobId}
            onRun={handleRun}
            onCancel={handleCancel}
          />

          {isRunning && (
            <AgentStepStream agentId="braniac" agentName="Braniac" maxBubbles={8} />
          )}

          <StakeholderProfileCards profiles={profiles} />
        </div>

        <div className="space-y-4">
          <BraniacJobHistory jobs={jobs} />
          <BraniacPatternList
            patterns={patterns}
            onApprove={handleApprovePattern}
            onReject={handleRejectPattern}
            onUpdate={handleUpdatePattern}
          />
        </div>
      </div>
    </div>
  )
}
