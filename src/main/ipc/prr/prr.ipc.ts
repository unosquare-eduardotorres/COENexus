import { BrowserWindow, dialog } from 'electron'
import { writeFileSync } from 'node:fs'
import { IPC_CHANNELS } from '../../../shared/ipc-channels'
import type { PrrAddCommentParams, PrrCommentDto, PrrDetailResult, PrrReportItem, PrrUpdateCoeStatusParams, ExcelExportResult } from '../../../shared/ipc-types'
import { prrRepository, type PrrReportRow } from '../../db/repositories/prrRepository'
import { syncRepository } from '../../db/repositories/syncRepository'
import { registerIpcHandler } from '../registerIpcHandler'
import { validateSender } from '../validate'
import { createLogger } from '../../services/logger'

const log = createLogger('PrrIPC')

function calculateDaysOpened(requestDate: string | null): number {
  if (!requestDate) return 0
  const opened = new Date(requestDate)
  if (Number.isNaN(opened.getTime())) return 0
  const now = new Date()
  const diffMs = now.getTime() - opened.getTime()
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
}

function mapRowToDto(row: PrrReportRow): PrrReportItem {
  let coeComments: PrrCommentDto[] = []
  try {
    const parsed = JSON.parse(row.coe_comments)
    if (Array.isArray(parsed)) {
      coeComments = parsed as PrrCommentDto[]
    }
  } catch {
    coeComments = []
  }

  return {
    upstreamId: row.upstream_id,
    employee: row.employee,
    account: row.account,
    team: row.team,
    mainSkill: row.main_skill,
    seniority: row.seniority,
    transitionStatus: row.transition_status,
    transitionSubType: row.transition_sub_type,
    location: row.location,
    requestDate: row.request_date,
    daysSinceLastInterview: row.days_since_last_interview,
    impact: row.impact,
    attritionRisk: row.attrition_risk,
    comments: row.comments,
    presentationsCount: row.presentations_count,
    coeStatus: row.coe_status,
    coeComments,
    daysOpened: calculateDaysOpened(row.request_date),
    syncedAt: row.synced_at,
  }
}

export function registerPrrHandlers(): void {
  registerIpcHandler(
    IPC_CHANNELS.PRR_GET_ALL,
    async (event): Promise<PrrReportItem[]> => {
      validateSender(event)
      log.info('PRR report requested')
      return prrRepository.getAll().map(mapRowToDto)
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.PRR_GET_DETAIL,
    async (event, upstreamId: number): Promise<PrrDetailResult | null> => {
      validateSender(event)
      log.info('PRR detail requested', { upstreamId })
      const prr = prrRepository.getByUpstreamId(upstreamId)
      if (!prr) return null
      const presentations = syncRepository.getPrrPresentationsByPrrId(upstreamId).map((presentation) => ({
        openPositionId: presentation.open_position_id,
        account: presentation.account,
        openPositionStatus: presentation.open_position_status,
        location: presentation.location,
        presentedOn: presentation.presented_on,
        candidateStatus: presentation.candidate_status,
      }))
      return { prr: mapRowToDto(prr), presentations }
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.PRR_UPDATE_COE_STATUS,
    async (event, params: PrrUpdateCoeStatusParams): Promise<{ updated: boolean }> => {
      validateSender(event)
      log.info('PRR CoE status update requested', {
        upstreamId: params.upstreamId,
        coeStatus: params.coeStatus,
      })
      prrRepository.updateCoeStatus(params.upstreamId, params.coeStatus)
      return { updated: true }
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.PRR_ADD_COMMENT,
    async (event, params: PrrAddCommentParams): Promise<{ comments: PrrCommentDto[] }> => {
      validateSender(event)
      log.info('PRR comment requested', {
        upstreamId: params.upstreamId,
        author: params.author,
      })
      prrRepository.addComment(params.upstreamId, params.text, params.author)
      return { comments: prrRepository.getComments(params.upstreamId) }
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.PRR_DELETE,
    async (event, upstreamId: number): Promise<{ deleted: boolean }> => {
      validateSender(event)
      log.warn('PRR delete requested', { upstreamId })
      const deleted = prrRepository.deleteByUpstreamId(upstreamId)
      return { deleted }
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.PRR_GET_SYNC_STATUS,
    async (event): Promise<{ total: number; lastSyncedAt: string | null }> => {
      validateSender(event)
      log.info('PRR sync status requested')
      return prrRepository.getSyncStatus()
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.PRR_EXPORT_XLSX,
    async (event, items: PrrReportItem[]): Promise<ExcelExportResult> => {
      validateSender(event)
      log.info('PRR export requested', { itemCount: items.length })
      const { generateExcelBuffer } = await import('../../services/excelExportService')

      const COE_STATUS_COLORS: Record<string, { bg: string; font: string }> = {
        'Pending Evaluation': { bg: 'FF3d2e00', font: 'FFfbbf24' },
        'Ready to Present':   { bg: 'FF0d3320', font: 'FF34d399' },
        'Presented':          { bg: 'FF0d3332', font: 'FF2dd4bf' },
        'Needs Attention':    { bg: 'FF3d1014', font: 'FFfb7185' },
        'Not Set':            { bg: 'FF1e1e2e', font: 'FF9ca3af' },
        'Not Applies':        { bg: 'FF1e1e2e', font: 'FF94a3b8' },
        'Closed':             { bg: 'FF2d0f0f', font: 'FFf87171' },
      }

      const buffer = await generateExcelBuffer({
        sheetName: 'Project Reallocations',
        columns: [
          { header: 'Employee', key: 'employee' },
          { header: 'Client', key: 'account' },
          { header: 'Team', key: 'team' },
          { header: 'Main Skill', key: 'mainSkill' },
          { header: 'Seniority', key: 'seniority' },
          { header: 'PRR Status', key: 'transitionStatus' },
          { header: 'Sub Type', key: 'transitionSubType' },
          { header: 'CoE Status', key: 'coeStatus' },
          { header: 'Location', key: 'location' },
          { header: 'Request Date', key: 'requestDate' },
          { header: 'Days Opened', key: 'daysOpened', width: 14 },
          { header: 'Days Since Last Interview', key: 'daysSinceLastInterview', width: 18 },
          { header: 'Impact', key: 'impact' },
          { header: 'Attrition Risk', key: 'attritionRisk' },
          { header: 'Presentations', key: 'presentationsCount', width: 14 },
          { header: 'Upstream Comments', key: 'comments', width: 40 },
          { header: 'COE Comments', key: 'coeCommentsText', width: 40 },
        ],
        rows: items.map(item => ({
          ...item,
          coeCommentsText: item.coeComments.map(c => `${c.author}: ${c.text}`).join(' | '),
        })),
        statusColumn: { key: 'coeStatus', colorMap: COE_STATUS_COLORS },
      })

      const win = BrowserWindow.fromWebContents(event.sender)
      const { filePath, canceled } = await dialog.showSaveDialog(win!, {
        defaultPath: `project-reallocations-${new Date().toISOString().slice(0, 10)}.xlsx`,
        filters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
      })
      if (canceled || !filePath) {
        log.info('PRR export canceled')
        return { saved: false }
      }
      writeFileSync(filePath, buffer)
      log.info('PRR export saved', { filePath, itemCount: items.length })
      return { saved: true, filePath }
    }
  )
}
