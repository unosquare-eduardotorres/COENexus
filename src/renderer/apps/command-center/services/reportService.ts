import type { StalledThresholds, OpenPositionReportResult, PositionDetailResult, StalledPositionResult } from '../types'

export const reportService = {
  evaluatePositions(thresholds: StalledThresholds): Promise<OpenPositionReportResult> {
    return window.api.report.evaluatePositions(thresholds)
  },

  getPositionDetail(upstreamId: number): Promise<PositionDetailResult | null> {
    return window.api.report.getPositionDetail(upstreamId)
  },

  exportCsv(results: StalledPositionResult[]): Promise<{ saved: boolean; filePath?: string }> {
    return window.api.report.exportCsv(results)
  },

  getSyncStatus(): Promise<{ total: number; lastSyncedAt: string | null }> {
    return window.api.report.getSyncStatus()
  },

  getFeedbackCatalog(token: string): Promise<Record<number, string>> {
    return window.api.report.getFeedbackCatalog(token)
  },
}
