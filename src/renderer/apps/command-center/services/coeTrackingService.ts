import type {
  CoeTrackingSummary,
  PracticeTrackingSummary,
  SkillTrackingSummary,
  TrackedPosition,
  TrackedPositionDetail,
} from '../types'

export const coeTrackingService = {
  getOverview(): Promise<CoeTrackingSummary[]> {
    return window.api.coeTracking.getOverview()
  },

  getCoeDetail(coe: string): Promise<PracticeTrackingSummary[]> {
    return window.api.coeTracking.getCoeDetail(coe)
  },

  getPracticeDetail(coe: string, practice: string): Promise<SkillTrackingSummary[]> {
    return window.api.coeTracking.getPracticeDetail(coe, practice)
  },

  getPracticePositions(coe: string, practice: string): Promise<TrackedPosition[]> {
    return window.api.coeTracking.getPracticePositions(coe, practice)
  },

  getSkillPositions(coe: string, practice: string, skill: string): Promise<TrackedPosition[]> {
    return window.api.coeTracking.getSkillPositions(coe, practice, skill)
  },

  getCoePositions(coe: string): Promise<TrackedPosition[]> {
    return window.api.coeTracking.getCoePositions(coe)
  },

  getPositionDetail(upstreamId: number): Promise<TrackedPositionDetail | null> {
    return window.api.coeTracking.getPositionDetail(upstreamId)
  },

  getSyncStatus(): Promise<{ total: number; lastSyncedAt: string | null }> {
    return window.api.coeTracking.getSyncStatus()
  },
}
