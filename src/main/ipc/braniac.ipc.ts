import { BrowserWindow } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import type {
  BraniacApprovePatternParams,
  BraniacCancelParams,
  BraniacChatParams,
  BraniacClearPatternsParams,
  BraniacClearAccountParams,
  BraniacClearStakeholderParams,
  BraniacClearResult,
  BraniacCreatePatternParams,
  BraniacBeautifyPatternParams,
  BraniacDeletePatternParams,
  BraniacDeleteProfileParams,
  BraniacExtractResumeSkillsParams,
  BraniacGetAccountSummaryParams,
  BraniacGetAnalysisStatusParams,
  BraniacGetStakeholdersParams,
  BraniacAccountSummary,
  BraniacAnalysisStatusItem,
  BraniacJob,
  BraniacPattern,
  BraniacListAccountSummariesResult,
  BraniacListJobsParams,
  BraniacListPatternsParams,
  BraniacListProfilesParams,
  BraniacGetProfileParams,
  BraniacProgressInfo,
  BraniacRejectPatternParams,
  BraniacResponse,
  BraniacRunParams,
  BraniacStatusEvent,
  BraniacUpdatePatternParams,
} from '../../shared/ipc-types'
import { jobRepository, type AgentJobRow } from '../db/agents/repositories/jobRepository'
import { patternRepository } from '../db/agents/repositories/patternRepository'
import { stakeholderProfileRepository } from '../db/agents/repositories/stakeholderProfileRepository'
import { braniacScheduler } from '../services/braniacScheduler'
import { aggregateAccountMetrics } from '../services/braniacAccountAggregator'
import { getAgentsDatabase } from '../db/agents/agentsConnection'
import { getDatabase } from '../db/connection'
import { createLogger } from '../services/logger'
import { registerIpcHandler } from './registerIpcHandler'
import { validateSender } from './validate'

const log = createLogger('BraniacIPC')

function ok<T>(data: T): BraniacResponse<T> {
  return { success: true, data }
}

function fail<T>(message: string): BraniacResponse<T> {
  return { success: false, error: message }
}

function emitStatusEvent(event: IpcMainInvokeEvent, payload: BraniacStatusEvent): void {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win && !win.isDestroyed()) {
    win.webContents.send(IPC_CHANNELS.BRANIAC_STATUS_EVENT, payload)
  }
}

function nowIso(): string {
  return new Date().toISOString()
}

function mapJobRow(row: AgentJobRow): BraniacJob {
  return {
    id: row.id,
    status: row.status,
    scope_type: row.scope_type as 'account' | 'stakeholder',
    scope_value: row.scope_value,
    initiated_by: row.initiated_by,
    run_reason: row.run_reason,
    pipeline_phase: row.pipeline_phase,
    started_at: row.started_at,
    completed_at: row.completed_at,
    error_message: row.error_message,
    metadata_json: row.metadata_json,
    created_at: row.created_at,
  }
}

export function registerBraniacHandlers(): void {
  registerIpcHandler(IPC_CHANNELS.BRANIAC_RUN, async (event: IpcMainInvokeEvent, params: BraniacRunParams) => {
    validateSender(event)
    try {
      const runPromise = braniacScheduler.trigger({
        scope: params.scope,
        account: params.account,
        stakeholder: params.stakeholder,
        event,
      })

      const status = braniacScheduler.getStatus()
      emitStatusEvent(event, { status: 'running', job_id: status.job_id, timestamp: nowIso() })

      let progressInterval: ReturnType<typeof setInterval> | null = null

      const pollProgress = () => {
        const currentStatus = braniacScheduler.getStatus()
        if (!currentStatus.running || !currentStatus.job_id) return
        const currentJob = jobRepository.getById(currentStatus.job_id)
        if (!currentJob?.metadata_json) return

        try {
          const meta = JSON.parse(currentJob.metadata_json)
          if (typeof meta.progressPct === 'number') {
            const progress: BraniacProgressInfo = {
              batch: meta.batch ?? 0,
              totalBatches: meta.totalBatches ?? 0,
              positionsProcessed: meta.positionsProcessed ?? 0,
              totalPositions: meta.totalPositions ?? 0,
              progressPct: meta.progressPct,
              phase: (meta.phase ?? currentJob.pipeline_phase ?? 'analyzing') as BraniacProgressInfo['phase'],
            }
            emitStatusEvent(event, {
              status: 'running',
              job_id: currentStatus.job_id,
              timestamp: nowIso(),
              progress,
            })
          }
        } catch { /* ignore parse errors */ }
      }

      progressInterval = setInterval(pollProgress, 2000)

      runPromise.then((completedJob) => {
        if (progressInterval) clearInterval(progressInterval)
        emitStatusEvent(event, {
          status: completedJob.status === 'completed' ? 'completed' : 'failed',
          job_id: completedJob.id,
          timestamp: nowIso(),
          error_message: completedJob.status === 'failed' ? (completedJob.error_message ?? undefined) : undefined,
          progress: { batch: 0, totalBatches: 0, positionsProcessed: 0, totalPositions: 0, progressPct: 100, phase: 'done' },
        })
      }).catch((err) => {
        if (progressInterval) clearInterval(progressInterval)
        const errorMessage = err instanceof Error ? err.message : String(err)
        emitStatusEvent(event, { status: 'failed', job_id: null, timestamp: nowIso(), error_message: errorMessage })
        log.error('Braniac run async failed', err instanceof Error ? err : new Error(errorMessage))
      })

      const jobs = jobRepository.listByAgentType('braniac', 1)
      const latestJob = jobs[0]
      return ok(latestJob ? mapJobRow(latestJob) : { id: '', status: 'running' as const, scope_type: params.scope, scope_value: params.account, initiated_by: 'user', run_reason: '', pipeline_phase: 'aggregating', started_at: nowIso(), completed_at: null, error_message: null, metadata_json: '{}', created_at: nowIso() })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to run Braniac'
      log.error('braniac:run failed', error instanceof Error ? error : new Error(message))
      return fail(message)
    }
  })

  registerIpcHandler(IPC_CHANNELS.BRANIAC_CANCEL, async (event: IpcMainInvokeEvent, params: BraniacCancelParams) => {
    validateSender(event)
    try {
      const canceled = braniacScheduler.cancel(params.job_id)
      emitStatusEvent(event, { status: 'idle', job_id: null, timestamp: nowIso() })
      return ok({ canceled })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to cancel Braniac'
      log.error('braniac:cancel failed', error instanceof Error ? error : new Error(message))
      return fail(message)
    }
  })

  registerIpcHandler(IPC_CHANNELS.BRANIAC_GET_STATUS, async (event: IpcMainInvokeEvent) => {
    validateSender(event)
    try {
      return ok(braniacScheduler.getStatus())
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get Braniac status'
      log.error('braniac:get-status failed', error instanceof Error ? error : new Error(message))
      return fail(message)
    }
  })

  registerIpcHandler(IPC_CHANNELS.BRANIAC_LIST_JOBS, async (event: IpcMainInvokeEvent, params: BraniacListJobsParams | void) => {
    validateSender(event)
    try {
      const rows = jobRepository.listByAgentType('braniac', params?.limit ?? 50, params?.offset ?? 0)
      return ok(rows.map(mapJobRow))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list Braniac jobs'
      log.error('braniac:list-jobs failed', error instanceof Error ? error : new Error(message))
      return fail(message)
    }
  })

  registerIpcHandler(IPC_CHANNELS.BRANIAC_GET_JOB, async (event: IpcMainInvokeEvent, jobId: string) => {
    validateSender(event)
    try {
      const row = jobRepository.getById(jobId)
      return ok(row ? mapJobRow(row) : null)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get Braniac job'
      log.error('braniac:get-job failed', error instanceof Error ? error : new Error(message))
      return fail(message)
    }
  })

  registerIpcHandler(IPC_CHANNELS.BRANIAC_LIST_PATTERNS, async (event: IpcMainInvokeEvent, params: BraniacListPatternsParams | void) => {
    validateSender(event)
    try {
      let rows
      if (params?.account) {
        rows = patternRepository.listPatternsByAccount(params.account)
      } else if (params?.approval_status) {
        rows = patternRepository.listPatternsByApprovalStatus(params.approval_status)
      } else {
        rows = patternRepository.listPatternsBySourceAgent('braniac')
      }
      return ok(rows)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list Braniac patterns'
      log.error('braniac:list-patterns failed', error instanceof Error ? error : new Error(message))
      return fail(message)
    }
  })

  registerIpcHandler(IPC_CHANNELS.BRANIAC_LIST_PROFILES, async (event: IpcMainInvokeEvent, params: BraniacListProfilesParams | void) => {
    validateSender(event)
    try {
      const rows = params?.account
        ? stakeholderProfileRepository.listByAccount(params.account)
        : stakeholderProfileRepository.listAll()
      return ok(rows)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list stakeholder profiles'
      log.error('braniac:list-profiles failed', error instanceof Error ? error : new Error(message))
      return fail(message)
    }
  })

  registerIpcHandler(IPC_CHANNELS.BRANIAC_GET_PROFILE, async (event: IpcMainInvokeEvent, params: BraniacGetProfileParams) => {
    validateSender(event)
    try {
      const row = stakeholderProfileRepository.getByStakeholderAndAccount(params.stakeholder, params.account)
      return ok(row ?? null)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get stakeholder profile'
      log.error('braniac:get-profile failed', error instanceof Error ? error : new Error(message))
      return fail(message)
    }
  })

  registerIpcHandler(IPC_CHANNELS.BRANIAC_GET_ACCOUNTS, async (event: IpcMainInvokeEvent) => {
    validateSender(event)
    try {
      const nexusDb = getDatabase()
      const rows = nexusDb.prepare(
        "SELECT DISTINCT account FROM synced_open_positions WHERE account != '' ORDER BY account"
      ).all() as { account: string }[]
      return ok(rows.map(r => r.account))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get accounts'
      log.error('braniac:get-accounts failed', error instanceof Error ? error : new Error(message))
      return fail(message)
    }
  })

  registerIpcHandler(IPC_CHANNELS.BRANIAC_APPROVE_PATTERN, async (event: IpcMainInvokeEvent, params: BraniacApprovePatternParams) => {
    validateSender(event)
    try {
      const updated = patternRepository.updatePattern(params.id, { approval_status: 'approved', is_active: 1 })
      return ok({ updated })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to approve pattern'
      log.error('braniac:approve-pattern failed', error instanceof Error ? error : new Error(message))
      return fail(message)
    }
  })

  registerIpcHandler(IPC_CHANNELS.BRANIAC_REJECT_PATTERN, async (event: IpcMainInvokeEvent, params: BraniacRejectPatternParams) => {
    validateSender(event)
    try {
      const updates: Record<string, unknown> = { approval_status: 'rejected', is_active: 0 }
      if (params.reason) {
        updates.rejection_reason = params.reason
      }
      const updated = patternRepository.updatePattern(params.id, updates)
      return ok({ updated })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reject pattern'
      log.error('braniac:reject-pattern failed', error instanceof Error ? error : new Error(message))
      return fail(message)
    }
  })

  registerIpcHandler(IPC_CHANNELS.BRANIAC_UPDATE_PATTERN, async (event: IpcMainInvokeEvent, params: BraniacUpdatePatternParams) => {
    validateSender(event)
    try {
      const updates: Record<string, unknown> = {}
      if (params.pattern_text !== undefined) updates.pattern_text = params.pattern_text
      if (params.confidence_score !== undefined) updates.confidence_score = params.confidence_score
      const updated = patternRepository.updatePattern(params.id, updates)
      return ok({ updated })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update pattern'
      log.error('braniac:update-pattern failed', error instanceof Error ? error : new Error(message))
      return fail(message)
    }
  })

  registerIpcHandler(IPC_CHANNELS.BRANIAC_GET_STAKEHOLDERS, async (event: IpcMainInvokeEvent, params: BraniacGetStakeholdersParams) => {
    validateSender(event)
    try {
      const nexusDb = getDatabase()
      const rows = nexusDb.prepare(
        "SELECT DISTINCT stakeholder FROM synced_open_positions WHERE account = ? AND stakeholder != '' ORDER BY stakeholder"
      ).all(params.account) as { stakeholder: string }[]
      return ok(rows.map(r => r.stakeholder))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get stakeholders'
      log.error('braniac:get-stakeholders failed', error instanceof Error ? error : new Error(message))
      return fail(message)
    }
  })

  registerIpcHandler(IPC_CHANNELS.BRANIAC_GET_ANALYSIS_STATUS, async (event: IpcMainInvokeEvent, params: BraniacGetAnalysisStatusParams) => {
    validateSender(event)
    try {
      const nexusDb = getDatabase()
      const agentsDb = (await import('../db/agents/agentsConnection')).getAgentsDatabase()

      const liveCounts = nexusDb.prepare(`
        SELECT
          sop.stakeholder,
          COUNT(DISTINCT sop.id) as positions,
          COUNT(opc.id) as candidates
        FROM synced_open_positions sop
        LEFT JOIN open_position_candidates opc ON opc.open_position_id = sop.id
        WHERE sop.account = ?
        GROUP BY sop.stakeholder
      `).all(params.account) as { stakeholder: string; positions: number; candidates: number }[]

      const lastAccountJob = agentsDb.prepare(`
        SELECT metadata_json, completed_at, id FROM agent_jobs
        WHERE agent_type = 'braniac' AND status = 'completed'
          AND scope_value = ? AND scope_type = 'account'
        ORDER BY completed_at DESC LIMIT 1
      `).get(params.account) as { metadata_json: string; completed_at: string; id: string } | undefined

      const profiles = stakeholderProfileRepository.listByAccount(params.account)
      const profileMap = new Map(profiles.map(p => [p.stakeholder_name, p]))

      const items: BraniacAnalysisStatusItem[] = []

      const totalLiveDataPoints = liveCounts.reduce((s, r) => s + Math.max(r.positions, r.candidates), 0)
      const totalLivePositions = liveCounts.reduce((s, r) => s + r.positions, 0)

      let lastAccountDataPoints: number | null = null
      let lastAccountPositions: number | null = null
      if (lastAccountJob) {
        try {
          const meta = JSON.parse(lastAccountJob.metadata_json)
          lastAccountDataPoints = meta.dataPointsCount ?? null
          lastAccountPositions = meta.totalPositions ?? null
        } catch {}
      }

      items.push({
        scope: 'account',
        account: params.account,
        stakeholder: null,
        currentDataPoints: totalLiveDataPoints,
        currentPositions: totalLivePositions,
        lastAnalyzedDataPoints: lastAccountDataPoints,
        lastAnalyzedPositions: lastAccountPositions,
        lastAnalyzedAt: lastAccountJob?.completed_at ?? null,
        lastJobId: lastAccountJob?.id ?? null,
        hasNewData: lastAccountDataPoints === null || totalLiveDataPoints !== lastAccountDataPoints,
      })

      const coveredByAccountJob = lastAccountJob != null
      const accountIsUpToDate = lastAccountDataPoints !== null
        && totalLiveDataPoints === lastAccountDataPoints

      for (const row of liveCounts) {
        if (!row.stakeholder) continue
        const profile = profileMap.get(row.stakeholder)
        const liveDP = Math.max(row.positions, row.candidates)

        let stakeholderLastAnalyzedAt: string | null = profile?.updated_at ?? null
        let stakeholderLastJobId: string | null = profile?.last_inference_job_id ?? null

        if (coveredByAccountJob) {
          const accountTime = lastAccountJob!.completed_at
          if (!stakeholderLastAnalyzedAt || accountTime > stakeholderLastAnalyzedAt) {
            stakeholderLastAnalyzedAt = accountTime
            stakeholderLastJobId = lastAccountJob!.id
          }
        }

        const hasNewData = coveredByAccountJob ? !accountIsUpToDate : !profile

        items.push({
          scope: 'stakeholder',
          account: params.account,
          stakeholder: row.stakeholder,
          currentDataPoints: liveDP,
          currentPositions: row.positions,
          lastAnalyzedDataPoints: profile?.data_points_count ?? (coveredByAccountJob ? lastAccountDataPoints : null),
          lastAnalyzedPositions: null,
          lastAnalyzedAt: stakeholderLastAnalyzedAt,
          lastJobId: stakeholderLastJobId,
          hasNewData,
        })
      }

      return ok(items)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get analysis status'
      log.error('braniac:get-analysis-status failed', error instanceof Error ? error : new Error(message))
      return fail(message)
    }
  })

  registerIpcHandler(IPC_CHANNELS.BRANIAC_CREATE_PATTERN, async (event: IpcMainInvokeEvent, params: BraniacCreatePatternParams) => {
    validateSender(event)
    try {
      const row = patternRepository.createPattern({
        pattern_name: params.pattern_name,
        pattern_text: params.pattern_text,
        account: params.account,
        stakeholder: params.stakeholder ?? null,
        confidence_score: params.confidence_score ?? 1.0,
        source_agent: 'human',
        approval_status: 'approved',
        data_points_count: 0,
        is_active: 1,
      })
      return ok(row as BraniacPattern)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create pattern'
      log.error('braniac:create-pattern failed', error instanceof Error ? error : new Error(message))
      return fail(message)
    }
  })

  registerIpcHandler(IPC_CHANNELS.BRANIAC_BEAUTIFY_PATTERN, async (event: IpcMainInvokeEvent, params: BraniacBeautifyPatternParams) => {
    validateSender(event)
    try {
      const { claudeService } = await import('../services/claudeService')
      const { getConfig } = await import('../config')
      const model = getConfig().claude.haikuModel

      const systemPrompt = [
        'You are a pattern formatting assistant for a recruitment intelligence system.',
        'Your job is to take informal, human-written observations about hiring stakeholders',
        'and rewrite them as clean, structured patterns suitable for an AI matching engine.',
        '',
        'Rules:',
        '- Use professional, neutral language (no slang, no names like "he/she")',
        '- Reference the stakeholder by name if provided',
        '- Be specific: include rate numbers, country names, seniority levels when mentioned',
        '- Keep patterns concise (2-4 sentences max)',
        '- Generate a short, descriptive pattern name (3-6 words, Title Case)',
        '- Output ONLY valid JSON: { "pattern_name": "...", "pattern_text": "..." }',
      ].join('\n')

      const prompt = [
        `Account: ${params.account}`,
        params.stakeholder ? `Stakeholder: ${params.stakeholder}` : 'Scope: Account-wide',
        '',
        'Human observation:',
        `"${params.text}"`,
        '',
        'Rewrite as a structured pattern. Output JSON only.',
      ].join('\n')

      const { text: raw } = await claudeService.chatAsync(model, prompt, 512, 0.2, systemPrompt)
      const parsed = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```/g, '').trim())

      return ok({
        pattern_name: parsed.pattern_name,
        pattern_text: parsed.pattern_text,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to beautify pattern'
      log.error('braniac:beautify-pattern failed', error instanceof Error ? error : new Error(message))
      return fail(message)
    }
  })

  registerIpcHandler(IPC_CHANNELS.BRANIAC_CLEAR_PATTERNS, async (event: IpcMainInvokeEvent, params: BraniacClearPatternsParams) => {
    validateSender(event)
    try {
      const patterns = patternRepository.listPatternsByAccount(params.account)
      let deleted = 0
      for (const p of patterns) {
        if (params.stakeholder && p.stakeholder !== params.stakeholder) continue
        if (patternRepository.deletePattern(p.id)) deleted++
      }
      return ok({ deleted })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to clear patterns'
      log.error('braniac:clear-patterns failed', error instanceof Error ? error : new Error(message))
      return fail(message)
    }
  })

  registerIpcHandler(IPC_CHANNELS.BRANIAC_LIST_ACCOUNT_SUMMARIES, async (event: IpcMainInvokeEvent) => {
    validateSender(event)
    try {
      const profiles = stakeholderProfileRepository.listAll(1000)
      const byAccount = new Map<string, typeof profiles>()
      for (const p of profiles) {
        const bucket = byAccount.get(p.account) ?? []
        bucket.push(p)
        byAccount.set(p.account, bucket)
      }

      const summaries: BraniacAccountSummary[] = [...byAccount.entries()].map(([account, rows]) =>
        aggregateAccountMetrics(account, rows),
      )
      summaries.sort((a, b) => b.total_data_points - a.total_data_points)

      const result: BraniacListAccountSummariesResult = { summaries }
      return ok(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list account summaries'
      log.error('braniac:list-account-summaries failed', error instanceof Error ? error : new Error(message))
      return fail(message)
    }
  })

  registerIpcHandler(IPC_CHANNELS.BRANIAC_GET_ACCOUNT_SUMMARY, async (event: IpcMainInvokeEvent, params: BraniacGetAccountSummaryParams) => {
    validateSender(event)
    try {
      const rows = stakeholderProfileRepository.listByAccount(params.account)
      if (rows.length === 0) return ok(null)
      return ok(aggregateAccountMetrics(params.account, rows))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get account summary'
      log.error('braniac:get-account-summary failed', error instanceof Error ? error : new Error(message))
      return fail(message)
    }
  })

  registerIpcHandler(IPC_CHANNELS.BRANIAC_DELETE_PATTERN, async (event: IpcMainInvokeEvent, params: BraniacDeletePatternParams) => {
    validateSender(event)
    try {
      const deleted = patternRepository.deletePattern(params.id)
      return ok({ deleted })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete pattern'
      log.error('braniac:delete-pattern failed', error instanceof Error ? error : new Error(message))
      return fail(message)
    }
  })

  registerIpcHandler(IPC_CHANNELS.BRANIAC_DELETE_PROFILE, async (event: IpcMainInvokeEvent, params: BraniacDeleteProfileParams) => {
    validateSender(event)
    try {
      const deleted = stakeholderProfileRepository.deleteByStakeholderAndAccount(params.stakeholder, params.account)
      return ok({ deleted })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete profile'
      log.error('braniac:delete-profile failed', error instanceof Error ? error : new Error(message))
      return fail(message)
    }
  })

  registerIpcHandler(IPC_CHANNELS.BRANIAC_CLEAR_STAKEHOLDER, async (event: IpcMainInvokeEvent, params: BraniacClearStakeholderParams) => {
    validateSender(event)
    try {
      const agentsDb = getAgentsDatabase()
      const runTransaction = agentsDb.transaction(() => {
        const patternsDeleted = patternRepository.deletePatternsByAccount(params.account, params.stakeholder)
        const profileDeleted = stakeholderProfileRepository.deleteByStakeholderAndAccount(params.stakeholder, params.account)
        let jobsDeleted = 0
        if (params.include_jobs) {
          jobsDeleted = jobRepository.deleteByScopeAndAgent('braniac', 'stakeholder', params.stakeholder)
        }
        const result: BraniacClearResult = {
          patternsDeleted,
          profilesDeleted: profileDeleted ? 1 : 0,
          jobsDeleted,
        }
        return result
      })
      return ok(runTransaction())
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to clear stakeholder data'
      log.error('braniac:clear-stakeholder failed', error instanceof Error ? error : new Error(message))
      return fail(message)
    }
  })

  registerIpcHandler(IPC_CHANNELS.BRANIAC_CLEAR_ACCOUNT, async (event: IpcMainInvokeEvent, params: BraniacClearAccountParams) => {
    validateSender(event)
    try {
      const agentsDb = getAgentsDatabase()
      const runTransaction = agentsDb.transaction(() => {
        const patternsDeleted = patternRepository.deletePatternsByAccount(params.account)
        const profilesDeleted = stakeholderProfileRepository.deleteByAccount(params.account)
        let jobsDeleted = 0
        if (params.include_jobs) {
          jobsDeleted = jobRepository.deleteByScopeAndAgent('braniac', 'account', params.account)
        }
        const result: BraniacClearResult = { patternsDeleted, profilesDeleted, jobsDeleted }
        return result
      })
      return ok(runTransaction())
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to clear account data'
      log.error('braniac:clear-account failed', error instanceof Error ? error : new Error(message))
      return fail(message)
    }
  })

  registerIpcHandler(IPC_CHANNELS.BRANIAC_CHAT, async (event: IpcMainInvokeEvent, params: BraniacChatParams) => {
    validateSender(event)
    try {
      const { braniacChatService } = await import('../services/braniacChatService')
      const emitStep = (step: string) => {
        const win = BrowserWindow.fromWebContents(event.sender)
        if (win && !win.isDestroyed()) {
          win.webContents.send(IPC_CHANNELS.BRANIAC_CHAT_STEP_EVENT, step)
        }
      }

      const emitChunk = (text: string) => {
        const win = BrowserWindow.fromWebContents(event.sender)
        if (win && !win.isDestroyed()) {
          win.webContents.send(IPC_CHANNELS.BRANIAC_CHAT_CHUNK_EVENT, {
            text,
            timestamp: new Date().toISOString(),
          })
        }
      }

      const result = await braniacChatService.chat(
        params.message,
        emitStep,
        emitChunk,
        params.scopeAccount
      )
      return ok(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Braniac chat failed'
      log.error('braniac:chat failed', error instanceof Error ? error : new Error(message))
      return fail(message)
    }
  })

  registerIpcHandler(IPC_CHANNELS.BRANIAC_EXTRACT_RESUME_SKILLS, async (event: IpcMainInvokeEvent, params: BraniacExtractResumeSkillsParams) => {
    validateSender(event)
    try {
      const { resumeSkillExtractor } = await import('../services/resumeSkillExtractor')
      const result = await resumeSkillExtractor.extractBatch(
        params.sourceType,
        params.limit ?? 200,
        params.force ?? false,
        (progress) => {
          const win = BrowserWindow.fromWebContents(event.sender)
          if (win && !win.isDestroyed()) {
            win.webContents.send(IPC_CHANNELS.BRANIAC_STATUS_EVENT, {
              status: 'running' as const,
              job_id: null,
              timestamp: nowIso(),
              progress: {
                batch: progress.extracted,
                totalBatches: progress.total,
                positionsProcessed: progress.extracted + progress.failed,
                totalPositions: progress.total,
                progressPct: Math.round(((progress.extracted + progress.failed) / progress.total) * 100),
                phase: 'analyzing' as const,
              },
            })
          }
        }
      )
      return ok(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to extract resume skills'
      log.error('braniac:extract-resume-skills failed', error instanceof Error ? error : new Error(message))
      return fail(message)
    }
  })

  registerIpcHandler(IPC_CHANNELS.BRANIAC_GET_EXTRACTION_STATUS, async (event: IpcMainInvokeEvent) => {
    validateSender(event)
    try {
      const { resumeSkillExtractor } = await import('../services/resumeSkillExtractor')
      return ok(resumeSkillExtractor.getExtractionStatus())
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get extraction status'
      log.error('braniac:get-extraction-status failed', error instanceof Error ? error : new Error(message))
      return fail(message)
    }
  })

  log.info('Registered Braniac IPC handlers')
}
