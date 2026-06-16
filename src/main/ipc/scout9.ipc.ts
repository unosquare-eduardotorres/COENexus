import { BrowserWindow, Notification } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import type {
  Scout9ActivatePromptVersionParams,
  Scout9CreateGlossaryTermParams,
  Scout9CreateNoteParams,
  Scout9CreateOverrideParams,
  Scout9CreatePromptVersionParams,
  Scout9CreateRuleParams,
  Scout9ListReportsParams,
  Scout9Response,
  Scout9RunParams,
  Scout9SubmitSkipParams,
  Scout9TogglePatternParams,
  Scout9UpdateCandidateParams,
  Scout9UpdateConfigParams,
  Scout9UpdateGlossaryTermParams,
  Scout9UpdateNoteParams,
  Scout9UpdateRuleParams,
  Scout9UpsertSalaryBandParams,
  Scout9ChatParams,
} from '../../shared/ipc-types'
import type { SalaryBandRow } from '../db/agents/repositories/salaryBandRepository'
import type { SalaryBand, Country } from '../../shared/ipc-types'
import { knowledgeRepository } from '../db/agents/repositories/knowledgeRepository'
import { reportRepository } from '../db/agents/repositories/reportRepository'
import { patternRepository } from '../db/agents/repositories/patternRepository'
import { brainRepository } from '../db/agents/repositories/brainRepository'
import * as configRepository from '../db/agents/repositories/configRepository'
import * as salaryBandRepository from '../db/agents/repositories/salaryBandRepository'
import { scout9JobManager } from '../services/scout9JobManager'
import { getScopeOptions } from '../services/scout9ScopeService'
import { getTokenBudgetBreakdown } from '../services/scout9BrainService'
import { createLogger } from '../services/logger'
import { registerIpcHandler } from './registerIpcHandler'
import { validateSender } from './validate'

const log = createLogger('Scout9IPC')

// ─── Utilities ───────────────────────────────────────────────────────────────

function ok<T>(data: T): Scout9Response<T> {
  return { success: true, data }
}

function fail<T>(message: string): Scout9Response<T> {
  return { success: false, error: message }
}

function mapSalaryBandRow(row: SalaryBandRow): SalaryBand {
  return {
    id: row.id,
    countryCode: row.country_code,
    jobFamilyGroup: row.job_family_group,
    band: row.band,
    level: row.level,
    minMonthly: row.min_monthly,
    maxMonthly: row.max_monthly,
    source: row.source,
    isActive: row.is_active === 1,
  }
}

function emitPipelineEvent(event: IpcMainInvokeEvent, payload: unknown): void {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win && !win.isDestroyed()) {
    win.webContents.send(IPC_CHANNELS.SCOUT9_PIPELINE_EVENT, payload)
  }
}

function emitStatusEvent(event: IpcMainInvokeEvent, payload: unknown): void {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win && !win.isDestroyed()) {
    win.webContents.send(IPC_CHANNELS.SCOUT9_STATUS_EVENT, payload)
  }
}

function logAndFail<T>(channel: string, error: unknown, fallbackMessage: string): Scout9Response<T> {
  const message = error instanceof Error ? error.message : fallbackMessage
  log.error(`${channel} failed`, error instanceof Error ? error : new Error(message))
  return fail(message)
}

// ─── Pipeline Handlers ──────────────────────────────────────────────────────

async function handleRun(event: IpcMainInvokeEvent, params: Scout9RunParams) {
  validateSender(event)
  try {
    const pipelineEmit = (e: unknown) => emitPipelineEvent(event, e)
    const statusEmit = (e: unknown) => emitStatusEvent(event, e)

    const pipelineParams = {
      preset: params.scope_type === 'custom' ? (params.scope_value ?? undefined) : undefined,
      filters: params.scope_value ? { positions: [] as number[] } : undefined,
    }

    const jobPromise = scout9JobManager.run(
      pipelineParams as never,
      pipelineEmit as never,
      statusEmit as never,
      event
    )

    jobPromise.then((id) => {
      new Notification({ title: 'Scout-9 Complete', body: 'Report ready — click to view.' }).show()
      log.info('Scout-9 run finished', { jobId: id })
    }).catch((err) => {
      log.error('Scout-9 run failed in background', err instanceof Error ? err : new Error(String(err)))
    })

    const status = scout9JobManager.getStatus()
    return ok({ id: status.jobId ?? '', status: 'running' as const })
  } catch (error) {
    return logAndFail('scout9:run', error, 'Failed to start Scout-9 run')
  }
}

async function handleCancel(event: IpcMainInvokeEvent) {
  validateSender(event)
  try {
    scout9JobManager.cancel()
    return ok({ canceled: true })
  } catch (error) {
    return logAndFail('scout9:cancel', error, 'Failed to cancel Scout-9 run')
  }
}

async function handleGetStatus(event: IpcMainInvokeEvent) {
  validateSender(event)
  try {
    const status = scout9JobManager.getStatus()
    return ok({ active_job: status.jobId ? { id: status.jobId, status: status.status } : null })
  } catch (error) {
    return logAndFail('scout9:get-status', error, 'Failed to get Scout-9 status')
  }
}

async function handleGetScopeOptions(event: IpcMainInvokeEvent) {
  validateSender(event)
  try {
    return ok(getScopeOptions())
  } catch (error) {
    return logAndFail('scout9:get-scope-options', error, 'Failed to list scope options')
  }
}

// ─── Report Handlers ─────────────────────────────────────────────────────────

async function handleListReports(event: IpcMainInvokeEvent, params?: Scout9ListReportsParams) {
  validateSender(event)
  try {
    const limit = params?.limit ?? 100
    const offset = params?.offset ?? 0
    const allReports = reportRepository.listReports(limit, offset)
    const filtered = params?.status ? allReports.filter(r => r.status === params.status) : allReports
    return ok(filtered)
  } catch (error) {
    return logAndFail('scout9:list-reports', error, 'Failed to list reports')
  }
}

async function handleGetReport(event: IpcMainInvokeEvent, reportId: string) {
  validateSender(event)
  try {
    const report = reportRepository.getReportById(reportId) ?? null
    const candidates = report ? reportRepository.listCandidates(report.id) : []
    return ok(report ? { report, candidates } : null)
  } catch (error) {
    return logAndFail('scout9:get-report', error, 'Failed to get report')
  }
}

// ─── Candidate Handlers ──────────────────────────────────────────────────────

async function handleUpdateCandidate(event: IpcMainInvokeEvent, params: Scout9UpdateCandidateParams) {
  validateSender(event)
  try {
    const updated = reportRepository.updateCandidate(params.id, { status: params.status })
    if (!updated) throw new Error('Candidate not found')
    const candidate = reportRepository.getCandidateById(params.id)
    return ok(candidate)
  } catch (error) {
    return logAndFail('scout9:update-candidate', error, 'Failed to update candidate')
  }
}

async function handleSubmitSkip(event: IpcMainInvokeEvent, params: Scout9SubmitSkipParams) {
  validateSender(event)
  try {
    const created = patternRepository.createSkipFeedback({
      candidate_id: params.candidate_id,
      reason: params.reason,
      notes: params.notes ?? null,
    })
    return ok(created)
  } catch (error) {
    return logAndFail('scout9:submit-skip', error, 'Failed to submit skip feedback')
  }
}

// ─── Knowledge Base: Rules ───────────────────────────────────────────────────

async function handleListRules(event: IpcMainInvokeEvent) {
  validateSender(event)
  try {
    return ok(knowledgeRepository.listRules())
  } catch (error) {
    return logAndFail('scout9:kb-list-rules', error, 'Failed to list rules')
  }
}

async function handleCreateRule(event: IpcMainInvokeEvent, params: Scout9CreateRuleParams) {
  validateSender(event)
  try {
    const created = knowledgeRepository.createRule({
      rule_name: params.rule_name,
      rule_text: params.rule_text,
      priority: params.priority,
      is_active: params.is_active,
    })
    return ok(created)
  } catch (error) {
    return logAndFail('scout9:kb-create-rule', error, 'Failed to create rule')
  }
}

async function handleUpdateRule(event: IpcMainInvokeEvent, params: Scout9UpdateRuleParams) {
  validateSender(event)
  try {
    const { id, ...updates } = params
    const success = knowledgeRepository.updateRule(id, updates)
    if (!success) throw new Error('Rule not found')
    const updated = knowledgeRepository.getRuleById(id)
    return ok(updated)
  } catch (error) {
    return logAndFail('scout9:kb-update-rule', error, 'Failed to update rule')
  }
}

async function handleDeleteRule(event: IpcMainInvokeEvent, id: string) {
  validateSender(event)
  try {
    const deleted = knowledgeRepository.deleteRule(id)
    return ok({ deleted })
  } catch (error) {
    return logAndFail('scout9:kb-delete-rule', error, 'Failed to delete rule')
  }
}

// ─── Knowledge Base: Glossary ────────────────────────────────────────────────

async function handleListGlossary(event: IpcMainInvokeEvent) {
  validateSender(event)
  try {
    return ok(knowledgeRepository.listGlossary())
  } catch (error) {
    return logAndFail('scout9:kb-list-glossary', error, 'Failed to list glossary terms')
  }
}

async function handleCreateGlossaryTerm(event: IpcMainInvokeEvent, params: Scout9CreateGlossaryTermParams) {
  validateSender(event)
  try {
    const created = knowledgeRepository.createGlossaryTerm({
      term: params.term,
      definition: params.definition,
      synonyms: params.synonyms,
      is_active: params.is_active,
    })
    return ok(created)
  } catch (error) {
    return logAndFail('scout9:kb-create-glossary-term', error, 'Failed to create glossary term')
  }
}

async function handleUpdateGlossaryTerm(event: IpcMainInvokeEvent, params: Scout9UpdateGlossaryTermParams) {
  validateSender(event)
  try {
    const { id, ...updates } = params
    const success = knowledgeRepository.updateGlossaryTerm(id, updates)
    if (!success) throw new Error('Glossary term not found')
    const updated = knowledgeRepository.getGlossaryTermById(id)
    return ok(updated)
  } catch (error) {
    return logAndFail('scout9:kb-update-glossary-term', error, 'Failed to update glossary term')
  }
}

async function handleDeleteGlossaryTerm(event: IpcMainInvokeEvent, id: string) {
  validateSender(event)
  try {
    const deleted = knowledgeRepository.deleteGlossaryTerm(id)
    return ok({ deleted })
  } catch (error) {
    return logAndFail('scout9:kb-delete-glossary-term', error, 'Failed to delete glossary term')
  }
}

// ─── Knowledge Base: Notes ───────────────────────────────────────────────────

async function handleListNotes(event: IpcMainInvokeEvent) {
  validateSender(event)
  try {
    return ok(knowledgeRepository.listNotes())
  } catch (error) {
    return logAndFail('scout9:kb-list-notes', error, 'Failed to list notes')
  }
}

async function handleCreateNote(event: IpcMainInvokeEvent, params: Scout9CreateNoteParams) {
  validateSender(event)
  try {
    const created = knowledgeRepository.createNote({
      note_title: params.note_title,
      note_text: params.note_text,
      tags_json: params.tags_json,
      is_active: params.is_active,
    })
    return ok(created)
  } catch (error) {
    return logAndFail('scout9:kb-create-note', error, 'Failed to create note')
  }
}

async function handleUpdateNote(event: IpcMainInvokeEvent, params: Scout9UpdateNoteParams) {
  validateSender(event)
  try {
    const { id, ...updates } = params
    const success = knowledgeRepository.updateNote(id, updates)
    if (!success) throw new Error('Note not found')
    const updated = knowledgeRepository.getNoteById(id)
    return ok(updated)
  } catch (error) {
    return logAndFail('scout9:kb-update-note', error, 'Failed to update note')
  }
}

async function handleDeleteNote(event: IpcMainInvokeEvent, id: string) {
  validateSender(event)
  try {
    const deleted = knowledgeRepository.deleteNote(id)
    return ok({ deleted })
  } catch (error) {
    return logAndFail('scout9:kb-delete-note', error, 'Failed to delete note')
  }
}

// ─── Knowledge Base: Patterns & Overrides ────────────────────────────────────

async function handleCompileKnowledgeBase(event: IpcMainInvokeEvent) {
  validateSender(event)
  try {
    const budget = getTokenBudgetBreakdown()
    const rules = knowledgeRepository.listRules().filter(r => r.is_active === 1)
    const glossaryTerms = knowledgeRepository.listGlossary().filter(g => g.is_active === 1)
    const notesList = knowledgeRepository.listNotes().filter(n => n.is_active === 1)

    const compiled = [
      ...rules.map(r => r.rule_text),
      ...glossaryTerms.map(g => `${g.term}: ${g.definition}`),
      ...notesList.map(n => n.note_text),
    ].join('\n\n')

    return ok({ compiled_markdown: compiled, token_estimate: budget.total })
  } catch (error) {
    return logAndFail('scout9:kb-compile', error, 'Failed to compile knowledge base')
  }
}

async function handleListPatterns(event: IpcMainInvokeEvent) {
  validateSender(event)
  try {
    return ok(patternRepository.listPatterns())
  } catch (error) {
    return logAndFail('scout9:kb-list-patterns', error, 'Failed to list patterns')
  }
}

async function handleTogglePattern(event: IpcMainInvokeEvent, params: Scout9TogglePatternParams) {
  validateSender(event)
  try {
    const success = patternRepository.updatePattern(params.id, { is_active: params.is_active })
    if (!success) throw new Error('Pattern not found')
    const updated = patternRepository.getPatternById(params.id)
    return ok(updated)
  } catch (error) {
    return logAndFail('scout9:kb-toggle-pattern', error, 'Failed to toggle pattern')
  }
}

async function handleListOverrides(event: IpcMainInvokeEvent, clientId?: string) {
  validateSender(event)
  try {
    return ok(knowledgeRepository.listOverrides(clientId ?? undefined))
  } catch (error) {
    return logAndFail('scout9:kb-list-overrides', error, 'Failed to list overrides')
  }
}

async function handleCreateOverride(event: IpcMainInvokeEvent, params: Scout9CreateOverrideParams) {
  validateSender(event)
  try {
    const created = knowledgeRepository.createOverride({
      client_id: params.client_id,
      rule_id: params.rule_id,
      override_text: params.override_text,
      is_active: params.is_active,
    })
    return ok(created)
  } catch (error) {
    return logAndFail('scout9:kb-create-override', error, 'Failed to create override')
  }
}

async function handleDeleteOverride(event: IpcMainInvokeEvent, id: string) {
  validateSender(event)
  try {
    const deleted = knowledgeRepository.deleteOverride(id)
    return ok({ deleted })
  } catch (error) {
    return logAndFail('scout9:kb-delete-override', error, 'Failed to delete override')
  }
}

async function handleTokenBudget(event: IpcMainInvokeEvent) {
  validateSender(event)
  try {
    const budget = getTokenBudgetBreakdown()
    return ok({
      token_budget: budget.ceiling,
      estimated_tokens: budget.total,
      remaining_tokens: Math.max(0, budget.ceiling - budget.total),
    })
  } catch (error) {
    return logAndFail('scout9:kb-token-budget', error, 'Failed to compute token budget')
  }
}

// ─── Settings Handlers ───────────────────────────────────────────────────────

async function handleGetConfig(event: IpcMainInvokeEvent) {
  validateSender(event)
  try {
    return ok(configRepository.getConfig())
  } catch (error) {
    return logAndFail('scout9:settings-get-config', error, 'Failed to get Scout-9 config')
  }
}

async function handleUpdateConfig(event: IpcMainInvokeEvent, params: Scout9UpdateConfigParams) {
  validateSender(event)
  try {
    configRepository.updateConfig(params)
    return ok(configRepository.getConfig())
  } catch (error) {
    return logAndFail('scout9:settings-update-config', error, 'Failed to update Scout-9 config')
  }
}

async function handleListPrompts(event: IpcMainInvokeEvent) {
  validateSender(event)
  try {
    return ok(configRepository.listPromptVersions())
  } catch (error) {
    return logAndFail('scout9:settings-list-prompts', error, 'Failed to list prompt versions')
  }
}

async function handleCreatePrompt(event: IpcMainInvokeEvent, params: Scout9CreatePromptVersionParams) {
  validateSender(event)
  try {
    const created = configRepository.createPromptVersion(params.version_label, params.prompt_text)
    if (params.is_active === 1) {
      configRepository.activateVersion(created.id)
      return ok({ ...created, is_active: 1 as const, activated_at: new Date().toISOString() })
    }
    return ok(created)
  } catch (error) {
    return logAndFail('scout9:settings-create-prompt', error, 'Failed to create prompt version')
  }
}

async function handleActivatePrompt(event: IpcMainInvokeEvent, params: Scout9ActivatePromptVersionParams) {
  validateSender(event)
  try {
    configRepository.activateVersion(params.id)
    const versions = configRepository.listPromptVersions()
    const activated = versions.find(v => v.id === params.id)
    if (!activated) throw new Error('Prompt version not found')
    return ok(activated)
  } catch (error) {
    return logAndFail('scout9:settings-activate-prompt', error, 'Failed to activate prompt version')
  }
}

// ─── Brain Handlers ──────────────────────────────────────────────────────────

async function handleGetBrainSnapshot(event: IpcMainInvokeEvent) {
  validateSender(event)
  try {
    return ok(brainRepository.getLatest() ?? null)
  } catch (error) {
    return logAndFail('scout9:get-brain-snapshot', error, 'Failed to get brain snapshot')
  }
}

// ─── Salary Band Handlers ────────────────────────────────────────────────────

async function handleListSalaryBands(event: IpcMainInvokeEvent) {
  validateSender(event)
  try {
    const rows = salaryBandRepository.getAllSalaryBands()
    return ok(rows.map(mapSalaryBandRow))
  } catch (error) {
    return logAndFail('scout9:salary-bands-list', error, 'Failed to list salary bands')
  }
}

async function handleSalaryBandsByCountry(event: IpcMainInvokeEvent, countryCode: string) {
  validateSender(event)
  try {
    const rows = salaryBandRepository.getSalaryBandsByCountry(countryCode)
    return ok(rows.map(mapSalaryBandRow))
  } catch (error) {
    return logAndFail('scout9:salary-bands-by-country', error, 'Failed to get salary bands by country')
  }
}

async function handleUpsertSalaryBand(event: IpcMainInvokeEvent, params: Scout9UpsertSalaryBandParams) {
  validateSender(event)
  try {
    salaryBandRepository.upsertSalaryBand(params)
    return ok({ upserted: true })
  } catch (error) {
    return logAndFail('scout9:salary-bands-upsert', error, 'Failed to upsert salary band')
  }
}

async function handleDeleteSalaryBand(event: IpcMainInvokeEvent, id: string) {
  validateSender(event)
  try {
    salaryBandRepository.deleteSalaryBand(id)
    return ok({ deleted: true })
  } catch (error) {
    return logAndFail('scout9:salary-bands-delete', error, 'Failed to delete salary band')
  }
}

// ─── Reference Data Handlers ─────────────────────────────────────────────────

async function handleListJobFamilies(event: IpcMainInvokeEvent) {
  validateSender(event)
  try {
    const rows = salaryBandRepository.getAllJobFamilies()
    return ok(rows.map(r => ({
      id: r.id,
      name: r.name,
      jobFamilyGroup: r.job_family_group,
      isActive: r.is_active === 1,
    })))
  } catch (error) {
    return logAndFail('scout9:job-families-list', error, 'Failed to list job families')
  }
}

async function handleListCountries(event: IpcMainInvokeEvent) {
  validateSender(event)
  try {
    const rows = salaryBandRepository.getAllCountries()
    return ok(rows.map((r): Country => ({
      code: r.code,
      name: r.name,
      defaultCurrency: r.default_currency,
      upstreamCatalogName: r.upstream_catalog_name,
      isActive: r.is_active === 1,
    })))
  } catch (error) {
    return logAndFail('scout9:countries-list', error, 'Failed to list countries')
  }
}

// ─── Chat Handler ────────────────────────────────────────────────────────────

async function handleChat(event: IpcMainInvokeEvent, params: Scout9ChatParams) {
  validateSender(event)
  try {
    const { scout9ChatService } = await import('../services/scout9ChatService')
    const emitStep = (step: string) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (win && !win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.SCOUT9_CHAT_STEP_EVENT, step)
      }
    }

    const emitChunk = (text: string) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (win && !win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.SCOUT9_CHAT_CHUNK_EVENT, {
          text,
          timestamp: new Date().toISOString(),
        })
      }
    }

    const result = await scout9ChatService.chat(
      params.message,
      emitStep,
      emitChunk,
      params.scopeClient,
      params.scopeStakeholder
    )
    return ok(result)
  } catch (error) {
    return logAndFail('scout9:chat', error, 'Scout9 chat failed')
  }
}

// ─── Registration ────────────────────────────────────────────────────────────

export function registerScout9Handlers(): void {
  // Pipeline
  registerIpcHandler(IPC_CHANNELS.SCOUT9_RUN, handleRun)
  registerIpcHandler(IPC_CHANNELS.SCOUT9_CANCEL, handleCancel)
  registerIpcHandler(IPC_CHANNELS.SCOUT9_GET_STATUS, handleGetStatus)
  registerIpcHandler(IPC_CHANNELS.SCOUT9_GET_SCOPE_OPTIONS, handleGetScopeOptions)

  // Reports
  registerIpcHandler(IPC_CHANNELS.SCOUT9_LIST_REPORTS, handleListReports)
  registerIpcHandler(IPC_CHANNELS.SCOUT9_GET_REPORT, handleGetReport)

  // Candidates
  registerIpcHandler(IPC_CHANNELS.SCOUT9_UPDATE_CANDIDATE, handleUpdateCandidate)
  registerIpcHandler(IPC_CHANNELS.SCOUT9_SUBMIT_SKIP, handleSubmitSkip)

  // Knowledge Base: Rules
  registerIpcHandler(IPC_CHANNELS.SCOUT9_KB_LIST_RULES, handleListRules)
  registerIpcHandler(IPC_CHANNELS.SCOUT9_KB_CREATE_RULE, handleCreateRule)
  registerIpcHandler(IPC_CHANNELS.SCOUT9_KB_UPDATE_RULE, handleUpdateRule)
  registerIpcHandler(IPC_CHANNELS.SCOUT9_KB_DELETE_RULE, handleDeleteRule)

  // Knowledge Base: Glossary
  registerIpcHandler(IPC_CHANNELS.SCOUT9_KB_LIST_GLOSSARY, handleListGlossary)
  registerIpcHandler(IPC_CHANNELS.SCOUT9_KB_CREATE_GLOSSARY_TERM, handleCreateGlossaryTerm)
  registerIpcHandler(IPC_CHANNELS.SCOUT9_KB_UPDATE_GLOSSARY_TERM, handleUpdateGlossaryTerm)
  registerIpcHandler(IPC_CHANNELS.SCOUT9_KB_DELETE_GLOSSARY_TERM, handleDeleteGlossaryTerm)

  // Knowledge Base: Notes
  registerIpcHandler(IPC_CHANNELS.SCOUT9_KB_LIST_NOTES, handleListNotes)
  registerIpcHandler(IPC_CHANNELS.SCOUT9_KB_CREATE_NOTE, handleCreateNote)
  registerIpcHandler(IPC_CHANNELS.SCOUT9_KB_UPDATE_NOTE, handleUpdateNote)
  registerIpcHandler(IPC_CHANNELS.SCOUT9_KB_DELETE_NOTE, handleDeleteNote)

  // Knowledge Base: Patterns, Overrides & Token Budget
  registerIpcHandler(IPC_CHANNELS.SCOUT9_KB_COMPILE, handleCompileKnowledgeBase)
  registerIpcHandler(IPC_CHANNELS.SCOUT9_KB_LIST_PATTERNS, handleListPatterns)
  registerIpcHandler(IPC_CHANNELS.SCOUT9_KB_TOGGLE_PATTERN, handleTogglePattern)
  registerIpcHandler(IPC_CHANNELS.SCOUT9_KB_LIST_OVERRIDES, handleListOverrides)
  registerIpcHandler(IPC_CHANNELS.SCOUT9_KB_CREATE_OVERRIDE, handleCreateOverride)
  registerIpcHandler(IPC_CHANNELS.SCOUT9_KB_DELETE_OVERRIDE, handleDeleteOverride)
  registerIpcHandler(IPC_CHANNELS.SCOUT9_KB_TOKEN_BUDGET, handleTokenBudget)

  // Settings
  registerIpcHandler(IPC_CHANNELS.SCOUT9_SETTINGS_GET_CONFIG, handleGetConfig)
  registerIpcHandler(IPC_CHANNELS.SCOUT9_SETTINGS_UPDATE_CONFIG, handleUpdateConfig)
  registerIpcHandler(IPC_CHANNELS.SCOUT9_SETTINGS_LIST_PROMPTS, handleListPrompts)
  registerIpcHandler(IPC_CHANNELS.SCOUT9_SETTINGS_CREATE_PROMPT, handleCreatePrompt)
  registerIpcHandler(IPC_CHANNELS.SCOUT9_SETTINGS_ACTIVATE_PROMPT, handleActivatePrompt)

  // Brain
  registerIpcHandler(IPC_CHANNELS.SCOUT9_GET_BRAIN_SNAPSHOT, handleGetBrainSnapshot)

  // Salary Bands
  registerIpcHandler(IPC_CHANNELS.SCOUT9_SALARY_BANDS_LIST, handleListSalaryBands)
  registerIpcHandler(IPC_CHANNELS.SCOUT9_SALARY_BANDS_BY_COUNTRY, handleSalaryBandsByCountry)
  registerIpcHandler(IPC_CHANNELS.SCOUT9_SALARY_BANDS_UPSERT, handleUpsertSalaryBand)
  registerIpcHandler(IPC_CHANNELS.SCOUT9_SALARY_BANDS_DELETE, handleDeleteSalaryBand)

  // Reference Data
  registerIpcHandler(IPC_CHANNELS.SCOUT9_JOB_FAMILIES_LIST, handleListJobFamilies)
  registerIpcHandler(IPC_CHANNELS.SCOUT9_COUNTRIES_LIST, handleListCountries)

  // Chat
  registerIpcHandler(IPC_CHANNELS.SCOUT9_CHAT, handleChat)

  log.info('Registered Scout-9 IPC handlers')
}
