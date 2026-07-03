import type { PrrCoeStatus, PrrDetailResult, PrrReportItem } from '../types'

export const prrService = {
  getAll(): Promise<PrrReportItem[]> {
    return window.api.prr.getAll()
  },

  getDetail(upstreamId: number): Promise<PrrDetailResult | null> {
    return window.api.prr.getDetail(upstreamId)
  },

  updateCoeStatus(upstreamId: number, coeStatus: PrrCoeStatus): Promise<{ updated: boolean }> {
    return window.api.prr.updateCoeStatus(upstreamId, coeStatus)
  },

  addComment(upstreamId: number, text: string, author: string): Promise<{ comments: Array<{ text: string; author: string; createdAt: string }> }> {
    return window.api.prr.addComment(upstreamId, text, author)
  },

  delete(upstreamId: number): Promise<{ deleted: boolean }> {
    return window.api.prr.delete(upstreamId)
  },

  getSyncStatus(): Promise<{ total: number; lastSyncedAt: string | null }> {
    return window.api.prr.getSyncStatus()
  },
}
