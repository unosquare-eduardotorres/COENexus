import { dialog } from 'electron'
import { writeFileSync } from 'node:fs'
import { IPC_CHANNELS } from '../../../shared/ipc-channels'
import type { ReportStalledThresholds, ReportStalledPositionResult, ReportExportCsvResult, ReportEvaluateResult, ReportPositionDetailResult, ReportSyncStatus } from '../../../shared/ipc-types'
import { registerIpcHandler } from '../registerIpcHandler'
import { validateSender } from '../validate'
import { openPositionReportService } from '../../services/openPositionReportService'
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
}
