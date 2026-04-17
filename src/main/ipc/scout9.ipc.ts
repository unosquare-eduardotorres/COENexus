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
} from '../../shared/ipc-types'
import { knowledgeRepository } from '../db/agents/repositories/knowledgeRepository'
import { reportRepository } from '../db/agents/repositories/reportRepository'
import { patternRepository } from '../db/agents/repositories/patternRepository'
import { brainRepository } from '../db/agents/repositories/brainRepository'
import * as configRepository from '../db/agents/repositories/configRepository'
import { scout9JobManager } from '../services/scout9JobManager'
import { getScopeOptions } from '../services/scout9ScopeService'
import { getTokenBudgetBreakdown } from '../services/scout9BrainService'
import { createLogger } from '../services/logger'
import { registerIpcHandler } from './registerIpcHandler'
import { validateSender } from './validate'

const log = createLogger('Scout9IPC')

function ok<T>(data: T): Scout9Response<T> {
  return { success: true, data }
}

function fail<T>(message: string): Scout9Response<T> {
  return { success: false, error: message }
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

export function registerScout9Handlers(): void {
  registerIpcHandler(IPC_CHANNELS.SCOUT9_RUN, async (event: IpcMainInvokeEvent, params: Scout9RunParams) => {
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
      return fail(error instanceof Error ? error.message : 'Failed to start Scout-9 run')
    }
  })

  registerIpcHandler(IPC_CHANNELS.SCOUT9_CANCEL, async (event: IpcMainInvokeEvent) => {
    validateSender(event)
    try {
      scout9JobManager.cancel()
      return ok({ canceled: true })
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to cancel Scout-9 run')
    }
  })

  registerIpcHandler(IPC_CHANNELS.SCOUT9_GET_STATUS, async (event: IpcMainInvokeEvent) => {
    validateSender(event)
    try {
      const status = scout9JobManager.getStatus()
      return ok({ active_job: status.jobId ? { id: status.jobId, status: status.status } : null })
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to get Scout-9 status')
    }
  })

  registerIpcHandler(IPC_CHANNELS.SCOUT9_GET_SCOPE_OPTIONS, async (event: IpcMainInvokeEvent) => {
    validateSender(event)
    try {
      return ok(getScopeOptions())
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to list scope options')
    }
  })

  registerIpcHandler(IPC_CHANNELS.SCOUT9_LIST_REPORTS, async (event: IpcMainInvokeEvent, params?: Scout9ListReportsParams) => {
    validateSender(event)
    try {
      const limit = params?.limit ?? 100
      const offset = params?.offset ?? 0
      const allReports = reportRepository.listReports(limit, offset)
      const filtered = params?.status ? allReports.filter(r => r.status === params.status) : allReports
      return ok(filtered)
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to list reports')
    }
  })

  registerIpcHandler(IPC_CHANNELS.SCOUT9_GET_REPORT, async (event: IpcMainInvokeEvent, reportId: string) => {
    validateSender(event)
    try {
      const report = reportRepository.getReportById(reportId) ?? null
      const candidates = report ? reportRepository.listCandidates(report.id) : []
      return ok(report ? { report, candidates } : null)
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to get report')
    }
  })

  registerIpcHandler(IPC_CHANNELS.SCOUT9_UPDATE_CANDIDATE, async (event: IpcMainInvokeEvent, params: Scout9UpdateCandidateParams) => {
    validateSender(event)
    try {
      const updated = reportRepository.updateCandidate(params.id, { status: params.status })
      if (!updated) throw new Error('Candidate not found')
      const candidate = reportRepository.getCandidateById(params.id)
      return ok(candidate)
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to update candidate')
    }
  })

  registerIpcHandler(IPC_CHANNELS.SCOUT9_SUBMIT_SKIP, async (event: IpcMainInvokeEvent, params: Scout9SubmitSkipParams) => {
    validateSender(event)
    try {
      const created = patternRepository.createSkipFeedback({
        candidate_id: params.candidate_id,
        reason: params.reason,
        notes: params.notes ?? null,
      })
      return ok(created)
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to submit skip feedback')
    }
  })

  registerIpcHandler(IPC_CHANNELS.SCOUT9_KB_LIST_RULES, async (event: IpcMainInvokeEvent) => {
    validateSender(event)
    try {
      return ok(knowledgeRepository.listRules())
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to list rules')
    }
  })

  registerIpcHandler(IPC_CHANNELS.SCOUT9_KB_CREATE_RULE, async (event: IpcMainInvokeEvent, params: Scout9CreateRuleParams) => {
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
      return fail(error instanceof Error ? error.message : 'Failed to create rule')
    }
  })

  registerIpcHandler(IPC_CHANNELS.SCOUT9_KB_UPDATE_RULE, async (event: IpcMainInvokeEvent, params: Scout9UpdateRuleParams) => {
    validateSender(event)
    try {
      const { id, ...updates } = params
      const success = knowledgeRepository.updateRule(id, updates)
      if (!success) throw new Error('Rule not found')
      const updated = knowledgeRepository.getRuleById(id)
      return ok(updated)
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to update rule')
    }
  })

  registerIpcHandler(IPC_CHANNELS.SCOUT9_KB_DELETE_RULE, async (event: IpcMainInvokeEvent, id: string) => {
    validateSender(event)
    try {
      const deleted = knowledgeRepository.deleteRule(id)
      return ok({ deleted })
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to delete rule')
    }
  })

  registerIpcHandler(IPC_CHANNELS.SCOUT9_KB_LIST_GLOSSARY, async (event: IpcMainInvokeEvent) => {
    validateSender(event)
    try {
      return ok(knowledgeRepository.listGlossary())
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to list glossary terms')
    }
  })

  registerIpcHandler(IPC_CHANNELS.SCOUT9_KB_CREATE_GLOSSARY_TERM, async (event: IpcMainInvokeEvent, params: Scout9CreateGlossaryTermParams) => {
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
      return fail(error instanceof Error ? error.message : 'Failed to create glossary term')
    }
  })

  registerIpcHandler(IPC_CHANNELS.SCOUT9_KB_UPDATE_GLOSSARY_TERM, async (event: IpcMainInvokeEvent, params: Scout9UpdateGlossaryTermParams) => {
    validateSender(event)
    try {
      const { id, ...updates } = params
      const success = knowledgeRepository.updateGlossaryTerm(id, updates)
      if (!success) throw new Error('Glossary term not found')
      const updated = knowledgeRepository.getGlossaryTermById(id)
      return ok(updated)
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to update glossary term')
    }
  })

  registerIpcHandler(IPC_CHANNELS.SCOUT9_KB_DELETE_GLOSSARY_TERM, async (event: IpcMainInvokeEvent, id: string) => {
    validateSender(event)
    try {
      const deleted = knowledgeRepository.deleteGlossaryTerm(id)
      return ok({ deleted })
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to delete glossary term')
    }
  })

  registerIpcHandler(IPC_CHANNELS.SCOUT9_KB_LIST_NOTES, async (event: IpcMainInvokeEvent) => {
    validateSender(event)
    try {
      return ok(knowledgeRepository.listNotes())
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to list notes')
    }
  })

  registerIpcHandler(IPC_CHANNELS.SCOUT9_KB_CREATE_NOTE, async (event: IpcMainInvokeEvent, params: Scout9CreateNoteParams) => {
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
      return fail(error instanceof Error ? error.message : 'Failed to create note')
    }
  })

  registerIpcHandler(IPC_CHANNELS.SCOUT9_KB_UPDATE_NOTE, async (event: IpcMainInvokeEvent, params: Scout9UpdateNoteParams) => {
    validateSender(event)
    try {
      const { id, ...updates } = params
      const success = knowledgeRepository.updateNote(id, updates)
      if (!success) throw new Error('Note not found')
      const updated = knowledgeRepository.getNoteById(id)
      return ok(updated)
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to update note')
    }
  })

  registerIpcHandler(IPC_CHANNELS.SCOUT9_KB_DELETE_NOTE, async (event: IpcMainInvokeEvent, id: string) => {
    validateSender(event)
    try {
      const deleted = knowledgeRepository.deleteNote(id)
      return ok({ deleted })
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to delete note')
    }
  })

  registerIpcHandler(IPC_CHANNELS.SCOUT9_KB_COMPILE, async (event: IpcMainInvokeEvent) => {
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
      return fail(error instanceof Error ? error.message : 'Failed to compile knowledge base')
    }
  })

  registerIpcHandler(IPC_CHANNELS.SCOUT9_KB_LIST_PATTERNS, async (event: IpcMainInvokeEvent) => {
    validateSender(event)
    try {
      return ok(patternRepository.listPatterns())
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to list patterns')
    }
  })

  registerIpcHandler(IPC_CHANNELS.SCOUT9_KB_TOGGLE_PATTERN, async (event: IpcMainInvokeEvent, params: Scout9TogglePatternParams) => {
    validateSender(event)
    try {
      const success = patternRepository.updatePattern(params.id, { is_active: params.is_active })
      if (!success) throw new Error('Pattern not found')
      const updated = patternRepository.getPatternById(params.id)
      return ok(updated)
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to toggle pattern')
    }
  })

  registerIpcHandler(IPC_CHANNELS.SCOUT9_KB_LIST_OVERRIDES, async (event: IpcMainInvokeEvent, clientId?: string) => {
    validateSender(event)
    try {
      return ok(knowledgeRepository.listOverrides(clientId ?? undefined))
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to list overrides')
    }
  })

  registerIpcHandler(IPC_CHANNELS.SCOUT9_KB_CREATE_OVERRIDE, async (event: IpcMainInvokeEvent, params: Scout9CreateOverrideParams) => {
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
      return fail(error instanceof Error ? error.message : 'Failed to create override')
    }
  })

  registerIpcHandler(IPC_CHANNELS.SCOUT9_KB_DELETE_OVERRIDE, async (event: IpcMainInvokeEvent, id: string) => {
    validateSender(event)
    try {
      const deleted = knowledgeRepository.deleteOverride(id)
      return ok({ deleted })
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to delete override')
    }
  })

  registerIpcHandler(IPC_CHANNELS.SCOUT9_KB_TOKEN_BUDGET, async (event: IpcMainInvokeEvent) => {
    validateSender(event)
    try {
      const budget = getTokenBudgetBreakdown()
      return ok({
        token_budget: budget.ceiling,
        estimated_tokens: budget.total,
        remaining_tokens: Math.max(0, budget.ceiling - budget.total),
      })
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to compute token budget')
    }
  })

  registerIpcHandler(IPC_CHANNELS.SCOUT9_SETTINGS_GET_CONFIG, async (event: IpcMainInvokeEvent) => {
    validateSender(event)
    try {
      return ok(configRepository.getConfig())
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to get Scout-9 config')
    }
  })

  registerIpcHandler(IPC_CHANNELS.SCOUT9_SETTINGS_UPDATE_CONFIG, async (event: IpcMainInvokeEvent, params: Scout9UpdateConfigParams) => {
    validateSender(event)
    try {
      configRepository.updateConfig(params)
      return ok(configRepository.getConfig())
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to update Scout-9 config')
    }
  })

  registerIpcHandler(IPC_CHANNELS.SCOUT9_SETTINGS_LIST_PROMPTS, async (event: IpcMainInvokeEvent) => {
    validateSender(event)
    try {
      return ok(configRepository.listPromptVersions())
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to list prompt versions')
    }
  })

  registerIpcHandler(IPC_CHANNELS.SCOUT9_SETTINGS_CREATE_PROMPT, async (event: IpcMainInvokeEvent, params: Scout9CreatePromptVersionParams) => {
    validateSender(event)
    try {
      const created = configRepository.createPromptVersion(params.version_label, params.prompt_text)
      if (params.is_active === 1) {
        configRepository.activateVersion(created.id)
        return ok({ ...created, is_active: 1 as const, activated_at: new Date().toISOString() })
      }
      return ok(created)
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to create prompt version')
    }
  })

  registerIpcHandler(IPC_CHANNELS.SCOUT9_SETTINGS_ACTIVATE_PROMPT, async (event: IpcMainInvokeEvent, params: Scout9ActivatePromptVersionParams) => {
    validateSender(event)
    try {
      configRepository.activateVersion(params.id)
      const versions = configRepository.listPromptVersions()
      const activated = versions.find(v => v.id === params.id)
      if (!activated) throw new Error('Prompt version not found')
      return ok(activated)
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to activate prompt version')
    }
  })

  registerIpcHandler(IPC_CHANNELS.SCOUT9_GET_BRAIN_SNAPSHOT, async (event: IpcMainInvokeEvent) => {
    validateSender(event)
    try {
      return ok(brainRepository.getLatest() ?? null)
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to get brain snapshot')
    }
  })

  log.info('Registered Scout-9 IPC handlers')
}
