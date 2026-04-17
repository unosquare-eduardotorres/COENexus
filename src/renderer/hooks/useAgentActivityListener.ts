import { useEffect, useCallback, useRef } from 'react'
import { useToast } from '../shared/components/ToastContext'
import { useNexusStatus } from '../contexts/NexusStatusContext'

const AGENT_LABELS: Record<string, string> = {
  'vigil': 'Vigil',
  'scout-9': 'Scout-9',
  'braniac': 'Braniac',
  'switchboard': 'Switchboard',
  'sensei': 'Sensei',
  'payday': 'Payday',
}

type NormalizedStatus = 'running' | 'completed' | 'failed' | 'canceled' | 'idle'

function isTerminal(status: NormalizedStatus): boolean {
  return status === 'completed' || status === 'failed' || status === 'canceled'
}

export function useAgentActivityListener() {
  const { showToast } = useToast()
  const { setAgentActivities } = useNexusStatus()
  const activitiesRef = useRef(new Map<string, { name: string; status: 'running' | 'queued'; runId: string | null }>())

  const handleAgentStatus = useCallback((
    agentId: string,
    status: NormalizedStatus,
    runId: string | null,
  ) => {
    const label = AGENT_LABELS[agentId] ?? agentId

    if (status === 'running') {
      activitiesRef.current.set(agentId, { name: label, status: 'running', runId })
    } else if (isTerminal(status) || status === 'idle') {
      activitiesRef.current.delete(agentId)

      if (status === 'completed') {
        showToast(`${label} completed successfully`, 'success', 5000)
      } else if (status === 'failed') {
        showToast(`${label} failed — check activity log`, 'error', 8000)
      } else if (status === 'canceled') {
        showToast(`${label} was canceled`, 'warning', 4000)
      }
    }

    setAgentActivities(
      activitiesRef.current.size > 0
        ? Array.from(activitiesRef.current.entries()).map(([id, a]) => ({ id, ...a }))
        : []
    )
  }, [showToast, setAgentActivities])

  useEffect(() => {
    const unsubVigil = window.api?.vigil?.onStatusEvent((e) => {
      const status = (e.status === 'queued' ? 'running' : e.status) as NormalizedStatus
      handleAgentStatus('vigil', status, e.run_id)
    })

    const unsubScout9 = window.api?.scout9?.onStatusEvent((e) => {
      const status = (e.status === 'queued' ? 'running' : e.status) as NormalizedStatus
      handleAgentStatus('scout-9', status, e.job_id)
    })

    const unsubBraniac = window.api?.braniac?.onStatusEvent((e) => {
      handleAgentStatus('braniac', e.status as NormalizedStatus, e.job_id)
    })

    window.api?.braniac?.getStatus().then((res) => {
      if (res?.success && res.data?.running) {
        handleAgentStatus('braniac', 'running', res.data.job_id)
      }
    }).catch(() => {})

    const unsubSteps = window.api?.agents?.onStepEvent((e) => {
      const status = e.status === 'started' ? 'running' : e.status as NormalizedStatus
      handleAgentStatus(e.agentId, status, null)
    })

    window.api?.vigil?.getStatus().then((res) => {
      if (res?.success && res.data?.active_run) {
        const s = res.data.active_run.status
        if (s === 'running' || s === 'queued') {
          handleAgentStatus('vigil', 'running', res.data.active_run.id)
        }
      }
    }).catch(() => {})

    window.api?.scout9?.getStatus().then((res) => {
      if (res?.success && res.data?.active_job) {
        const s = res.data.active_job.status
        if (s === 'running' || s === 'queued') {
          handleAgentStatus('scout-9', 'running', res.data.active_job.id)
        }
      }
    }).catch(() => {})

    return () => {
      unsubVigil?.()
      unsubScout9?.()
      unsubBraniac?.()
      unsubSteps?.()
    }
  }, [handleAgentStatus])
}
