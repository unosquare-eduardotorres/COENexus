import { BrowserWindow, dialog } from 'electron'
import { writeFileSync } from 'node:fs'
import { IPC_CHANNELS } from '../../../shared/ipc-channels'
import type { ReportStalledThresholds, ReportStalledPositionResult, ReportExportCsvResult, ReportExportPdfResult, ReportEvaluateResult, ReportPositionDetailResult, ReportSyncStatus, ExcelExportResult, ReportAcceptanceRateFilters, ReportAcceptanceRateResult } from '../../../shared/ipc-types'
import { registerIpcHandler } from '../registerIpcHandler'
import { validateSender } from '../validate'
import { openPositionReportService } from '../../services/openPositionReportService'
import { acceptanceRateService } from '../../services/acceptanceRateService'
import { syncRepository } from '../../db/repositories/syncRepository'
import { matchEngineService } from '../../services/matchEngineService'
import { matchRepository } from '../../db/repositories/matchRepository'
import { catalogService } from '../../services/catalogService'
import { createLogger } from '../../services/logger'

const log = createLogger('ReportIPC')

export function registerReportHandlers(): void {
  registerIpcHandler(
    IPC_CHANNELS.REPORT_EVALUATE_POSITIONS,
    async (event, thresholds: ReportStalledThresholds): Promise<ReportEvaluateResult> => {
      validateSender(event)
      return openPositionReportService.evaluate(thresholds)
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.REPORT_POSITION_DETAIL,
    async (event, upstreamId: number): Promise<ReportPositionDetailResult | null> => {
      validateSender(event)
      return openPositionReportService.getPositionDetail(upstreamId)
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.REPORT_EXPORT_CSV,
    async (event, results: ReportStalledPositionResult[]): Promise<ReportExportCsvResult> => {
      validateSender(event)
      const csvContent = openPositionReportService.generateCsv(results)
      const { filePath, canceled } = await dialog.showSaveDialog({
        defaultPath: `open-positions-report-${new Date().toISOString().slice(0, 10)}.csv`,
        filters: [{ name: 'CSV Files', extensions: ['csv'] }],
      })
      if (canceled || !filePath) return { saved: false }
      writeFileSync(filePath, csvContent, 'utf-8')
      log.info('CSV exported', { filePath, recordCount: results.length })
      return { saved: true, filePath }
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.REPORT_GET_SYNC_STATUS,
    async (event): Promise<ReportSyncStatus> => {
      validateSender(event)
      return openPositionReportService.getSyncStatus()
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.REPORT_GET_FEEDBACK_CATALOG,
    async (event, token: string): Promise<Record<number, string>> => {
      validateSender(event)
      const feedbacks = await catalogService.getCandidatePositionFeedbacks(token)
      return Object.fromEntries(feedbacks)
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.REPORT_GET_FEEDBACK_CATALOG_LOCAL,
    async (event): Promise<Record<number, string>> => {
      validateSender(event)
      return matchRepository.getFeedbackCatalog()
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.REPORT_DELETE_POSITION,
    async (event, upstreamId: number): Promise<{ deleted: boolean }> => {
      validateSender(event)
      log.info('Delete position requested', { upstreamId })
      syncRepository.deleteOpenPosition(upstreamId)
      matchEngineService.invalidateFilterCache()
      return { deleted: true }
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.REPORT_EXPORT_PDF,
    async (event): Promise<ReportExportPdfResult> => {
      validateSender(event)
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) return { saved: false }

      const pdfBuffer = await win.webContents.printToPDF({
        landscape: true,
        printBackground: true,
        preferCSSPageSize: false,
        pageSize: 'Tabloid',
        scale: 0.82,
        margins: { top: 0.3, bottom: 0.3, left: 0.3, right: 0.3 },
      })

      const { filePath, canceled } = await dialog.showSaveDialog(win, {
        defaultPath: `report-${new Date().toISOString().slice(0, 10)}.pdf`,
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
      })
      if (canceled || !filePath) return { saved: false }

      writeFileSync(filePath, pdfBuffer)
      log.info('PDF exported', { filePath })
      return { saved: true, filePath }
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.REPORT_EXPORT_XLSX,
    async (event, results: ReportStalledPositionResult[]): Promise<ExcelExportResult> => {
      validateSender(event)
      const buffer = await openPositionReportService.generateExcel(results)
      const win = BrowserWindow.fromWebContents(event.sender)
      const { filePath, canceled } = await dialog.showSaveDialog(win!, {
        defaultPath: `open-positions-report-${new Date().toISOString().slice(0, 10)}.xlsx`,
        filters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
      })
      if (canceled || !filePath) return { saved: false }
      writeFileSync(filePath, buffer)
      log.info('XLSX exported', { filePath, recordCount: results.length })
      return { saved: true, filePath }
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.REPORT_ACCEPTANCE_RATE,
    async (event, filters: ReportAcceptanceRateFilters): Promise<ReportAcceptanceRateResult> => {
      validateSender(event)
      return acceptanceRateService.evaluate(filters)
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.REPORT_ACCEPTANCE_RATE_COES,
    async (event): Promise<string[]> => {
      validateSender(event)
      return acceptanceRateService.getCoes()
    }
  )
}
