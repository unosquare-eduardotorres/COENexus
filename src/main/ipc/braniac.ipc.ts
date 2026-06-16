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

// ─── Utilities ───────────────────────────────────────────────────────────────

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

function logAndFail<T>(channel: string, error: unknown, fallbackMessage: string): BraniacResponse<T> {
  const message = error instanceof Error ? error.message : fallbackMessage
  log.error(`${channel} failed`, error instanceof Error ? error : new Error(message))
  return fail(message)
}

// ─── Pipeline Handlers ──────────────────────────────────────────────────────

async function handleRun(event: IpcMainInvokeEvent, params: BraniacRunParams) {
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
    return logAndFail('braniac:run', error, 'Failed to run Braniac')
  }
}

async function handleCancel(event: IpcMainInvokeEvent, params: BraniacCancelParams) {
  validateSender(event)
  try {
    const canceled = braniacScheduler.cancel(params.job_id)
    emitStatusEvent(event, { status: 'idle', job_id: null, timestamp: nowIso() })
    return ok({ canceled })
  } catch (error) {
    return logAndFail('braniac:cancel', error, 'Failed to cancel Braniac')
  }
}

async function handleGetStatus(event: IpcMainInvokeEvent) {
  validateSender(event)
  try {
    return ok(braniacScheduler.getStatus())
  } catch (error) {
    return logAndFail('braniac:get-status', error, 'Failed to get Braniac status')
  }
}

// ─── Job Handlers ────────────────────────────────────────────────────────────

async function handleListJobs(event: IpcMainInvokeEvent, params: BraniacListJobsParams | void) {
  validateSender(event)
  try {
    const rows = jobRepository.listByAgentType('braniac', params?.limit ?? 50, params?.offset ?? 0)
    return ok(rows.map(mapJobRow))
  } catch (error) {
    return logAndFail('braniac:list-jobs', error, 'Failed to list Braniac jobs')
  }
}

async function handleGetJob(event: IpcMainInvokeEvent, jobId: string) {
  validateSender(event)
  try {
    const row = jobRepository.getById(jobId)
    return ok(row ? mapJobRow(row) : null)
  } catch (error) {
    return logAndFail('braniac:get-job', error, 'Failed to get Braniac job')
  }
}

// ─── Pattern Handlers ────────────────────────────────────────────────────────

async function handleListPatterns(event: IpcMainInvokeEvent, params: BraniacListPatternsParams | void) {
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
    return logAndFail('braniac:list-patterns', error, 'Failed to list Braniac patterns')
  }
}

async function handleCreatePattern(event: IpcMainInvokeEvent, params: BraniacCreatePatternParams) {
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
    return logAndFail('braniac:create-pattern', error, 'Failed to create pattern')
  }
}

async function handleApprovePattern(event: IpcMainInvokeEvent, params: BraniacApprovePatternParams) {
  validateSender(event)
  try {
    const updated = patternRepository.updatePattern(params.id, { approval_status: 'approved', is_active: 1 })
    return ok({ updated })
  } catch (error) {
    return logAndFail('braniac:approve-pattern', error, 'Failed to approve pattern')
  }
}

async function handleRejectPattern(event: IpcMainInvokeEvent, params: BraniacRejectPatternParams) {
  validateSender(event)
  try {
    const updates: Record<string, unknown> = { approval_status: 'rejected', is_active: 0 }
    if (params.reason) {
      updates.rejection_reason = params.reason
    }
    const updated = patternRepository.updatePattern(params.id, updates)
    return ok({ updated })
  } catch (error) {
    return logAndFail('braniac:reject-pattern', error, 'Failed to reject pattern')
  }
}

async function handleUpdatePattern(event: IpcMainInvokeEvent, params: BraniacUpdatePatternParams) {
  validateSender(event)
  try {
    const updates: Record<string, unknown> = {}
    if (params.pattern_text !== undefined) updates.pattern_text = params.pattern_text
    if (params.confidence_score !== undefined) updates.confidence_score = params.confidence_score
    const updated = patternRepository.updatePattern(params.id, updates)
    return ok({ updated })
  } catch (error) {
    return logAndFail('braniac:update-pattern', error, 'Failed to update pattern')
  }
}

async function handleDeletePattern(event: IpcMainInvokeEvent, params: BraniacDeletePatternParams) {
  validateSender(event)
  try {
    const deleted = patternRepository.deletePattern(params.id)
    return ok({ deleted })
  } catch (error) {
    return logAndFail('braniac:delete-pattern', error, 'Failed to delete pattern')
  }
}

async function handleBeautifyPattern(event: IpcMainInvokeEvent, params: BraniacBeautifyPatternParams) {
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
    return logAndFail('braniac:beautify-pattern', error, 'Failed to beautify pattern')
  }
}

async function handleClearPatterns(event: IpcMainInvokeEvent, params: BraniacClearPatternsParams) {
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
    return logAndFail('braniac:clear-patterns', error, 'Failed to clear patterns')
  }
}

// ─── Profile Handlers ────────────────────────────────────────────────────────

async function handleListProfiles(event: IpcMainInvokeEvent, params: BraniacListProfilesParams | void) {
  validateSender(event)
  try {
    const rows = params?.account
      ? stakeholderProfileRepository.listByAccount(params.account)
      : stakeholderProfileRepository.listAll()
    return ok(rows)
  } catch (error) {
    return logAndFail('braniac:list-profiles', error, 'Failed to list stakeholder profiles')
  }
}

async function handleGetProfile(event: IpcMainInvokeEvent, params: BraniacGetProfileParams) {
  validateSender(event)
  try {
    const row = stakeholderProfileRepository.getByStakeholderAndAccount(params.stakeholder, params.account)
    return ok(row ?? null)
  } catch (error) {
    return logAndFail('braniac:get-profile', error, 'Failed to get stakeholder profile')
  }
}

async function handleDeleteProfile(event: IpcMainInvokeEvent, params: BraniacDeleteProfileParams) {
  validateSender(event)
  try {
    const deleted = stakeholderProfileRepository.deleteByStakeholderAndAccount(params.stakeholder, params.account)
    return ok({ deleted })
  } catch (error) {
    return logAndFail('braniac:delete-profile', error, 'Failed to delete profile')
  }
}

// ─── Account & Stakeholder Handlers ─────────────────────────────────────────

async function handleGetAccounts(event: IpcMainInvokeEvent) {
  validateSender(event)
  try {
    const nexusDb = getDatabase()
    const rows = nexusDb.prepare(
      "SELECT DISTINCT account FROM synced_open_positions WHERE account != '' ORDER BY account"
    ).all() as { account: string }[]
    return ok(rows.map(r => r.account))
  } catch (error) {
    return logAndFail('braniac:get-accounts', error, 'Failed to get accounts')
  }
}

async function handleGetStakeholders(event: IpcMainInvokeEvent, params: BraniacGetStakeholdersParams) {
  validateSender(event)
  try {
    const nexusDb = getDatabase()
    const rows = nexusDb.prepare(
      "SELECT DISTINCT stakeholder FROM synced_open_positions WHERE account = ? AND stakeholder != '' ORDER BY stakeholder"
    ).all(params.account) as { stakeholder: string }[]
    return ok(rows.map(r => r.stakeholder))
  } catch (error) {
    return logAndFail('braniac:get-stakeholders', error, 'Failed to get stakeholders')
  }
}

async function handleGetAnalysisStatus(event: IpcMainInvokeEvent, params: BraniacGetAnalysisStatusParams) {
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
    return logAndFail('braniac:get-analysis-status', error, 'Failed to get analysis status')
  }
}

async function handleListAccountSummaries(event: IpcMainInvokeEvent) {
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
    return logAndFail('braniac:list-account-summaries', error, 'Failed to list account summaries')
  }
}

async function handleGetAccountSummary(event: IpcMainInvokeEvent, params: BraniacGetAccountSummaryParams) {
  validateSender(event)
  try {
    const rows = stakeholderProfileRepository.listByAccount(params.account)
    if (rows.length === 0) return ok(null)
    return ok(aggregateAccountMetrics(params.account, rows))
  } catch (error) {
    return logAndFail('braniac:get-account-summary', error, 'Failed to get account summary')
  }
}

// ─── Chat Handlers ───────────────────────────────────────────────────────────

async function handleChat(event: IpcMainInvokeEvent, params: BraniacChatParams) {
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
    return logAndFail('braniac:chat', error, 'Braniac chat failed')
  }
}

// ─── Skills Handlers ─────────────────────────────────────────────────────────

async function handleExtractResumeSkills(event: IpcMainInvokeEvent, params: BraniacExtractResumeSkillsParams) {
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
    return logAndFail('braniac:extract-resume-skills', error, 'Failed to extract resume skills')
  }
}

async function handleGetExtractionStatus(event: IpcMainInvokeEvent) {
  validateSender(event)
  try {
    const { resumeSkillExtractor } = await import('../services/resumeSkillExtractor')
    return ok(resumeSkillExtractor.getExtractionStatus())
  } catch (error) {
    return logAndFail('braniac:get-extraction-status', error, 'Failed to get extraction status')
  }
}

// ─── Clear Data Handlers ─────────────────────────────────────────────────────

async function handleClearStakeholder(event: IpcMainInvokeEvent, params: BraniacClearStakeholderParams) {
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
    return logAndFail('braniac:clear-stakeholder', error, 'Failed to clear stakeholder data')
  }
}

async function handleClearAccount(event: IpcMainInvokeEvent, params: BraniacClearAccountParams) {
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
    return logAndFail('braniac:clear-account', error, 'Failed to clear account data')
  }
}

// ─── Registration ────────────────────────────────────────────────────────────

export function registerBraniacHandlers(): void {
  // Pipeline
  registerIpcHandler(IPC_CHANNELS.BRANIAC_RUN, handleRun)
  registerIpcHandler(IPC_CHANNELS.BRANIAC_CANCEL, handleCancel)
  registerIpcHandler(IPC_CHANNELS.BRANIAC_GET_STATUS, handleGetStatus)

  // Jobs
  registerIpcHandler(IPC_CHANNELS.BRANIAC_LIST_JOBS, handleListJobs)
  registerIpcHandler(IPC_CHANNELS.BRANIAC_GET_JOB, handleGetJob)

  // Patterns
  registerIpcHandler(IPC_CHANNELS.BRANIAC_LIST_PATTERNS, handleListPatterns)
  registerIpcHandler(IPC_CHANNELS.BRANIAC_CREATE_PATTERN, handleCreatePattern)
  registerIpcHandler(IPC_CHANNELS.BRANIAC_APPROVE_PATTERN, handleApprovePattern)
  registerIpcHandler(IPC_CHANNELS.BRANIAC_REJECT_PATTERN, handleRejectPattern)
  registerIpcHandler(IPC_CHANNELS.BRANIAC_UPDATE_PATTERN, handleUpdatePattern)
  registerIpcHandler(IPC_CHANNELS.BRANIAC_DELETE_PATTERN, handleDeletePattern)
  registerIpcHandler(IPC_CHANNELS.BRANIAC_BEAUTIFY_PATTERN, handleBeautifyPattern)
  registerIpcHandler(IPC_CHANNELS.BRANIAC_CLEAR_PATTERNS, handleClearPatterns)

  // Profiles
  registerIpcHandler(IPC_CHANNELS.BRANIAC_LIST_PROFILES, handleListProfiles)
  registerIpcHandler(IPC_CHANNELS.BRANIAC_GET_PROFILE, handleGetProfile)
  registerIpcHandler(IPC_CHANNELS.BRANIAC_DELETE_PROFILE, handleDeleteProfile)

  // Accounts & Stakeholders
  registerIpcHandler(IPC_CHANNELS.BRANIAC_GET_ACCOUNTS, handleGetAccounts)
  registerIpcHandler(IPC_CHANNELS.BRANIAC_GET_STAKEHOLDERS, handleGetStakeholders)
  registerIpcHandler(IPC_CHANNELS.BRANIAC_GET_ANALYSIS_STATUS, handleGetAnalysisStatus)
  registerIpcHandler(IPC_CHANNELS.BRANIAC_LIST_ACCOUNT_SUMMARIES, handleListAccountSummaries)
  registerIpcHandler(IPC_CHANNELS.BRANIAC_GET_ACCOUNT_SUMMARY, handleGetAccountSummary)

  // Chat
  registerIpcHandler(IPC_CHANNELS.BRANIAC_CHAT, handleChat)

  // Skills
  registerIpcHandler(IPC_CHANNELS.BRANIAC_EXTRACT_RESUME_SKILLS, handleExtractResumeSkills)
  registerIpcHandler(IPC_CHANNELS.BRANIAC_GET_EXTRACTION_STATUS, handleGetExtractionStatus)

  // Clear data
  registerIpcHandler(IPC_CHANNELS.BRANIAC_CLEAR_STAKEHOLDER, handleClearStakeholder)
  registerIpcHandler(IPC_CHANNELS.BRANIAC_CLEAR_ACCOUNT, handleClearAccount)

  log.info('Registered Braniac IPC handlers')
}
