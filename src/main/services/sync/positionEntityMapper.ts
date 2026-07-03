/**
 * Shared utility for building the synced_open_positions entity
 * from upstream API data. Used by both positionPipelineOrchestrator
 * and syncOpenPositionOrchestrator to eliminate duplication.
 */

import type { OpenPositionListItem, OpenPositionDetail, DiscussionCommentItem, PresentedCandidateItem } from '../upstreamApiService'
import type { SyncedOpenPositionRow } from '../../db/repositories/syncRepository'

export interface BuildPositionEntityInput {
  /** Position list item from the upstream API */
  pos: OpenPositionListItem
  /** Position detail (may be null if fetch failed) */
  detail: OpenPositionDetail | null | undefined
  /** Presented candidates count */
  candidatesCount: number
  /** Discussion comments for computing latest date */
  discussions: DiscussionCommentItem[]
  /** Status to assign — defaults to 'synced' */
  status?: string
}

/**
 * Build a synced open position entity from upstream API data.
 *
 * Centralises the field mapping logic that was previously duplicated
 * between positionPipelineOrchestrator and syncOpenPositionOrchestrator.
 */
export function buildOpenPositionEntity(
  input: BuildPositionEntityInput,
): Omit<SyncedOpenPositionRow, 'id'> {
  const { pos, detail, candidatesCount, discussions, status = 'synced' } = input

  const latestDiscussionDate = discussions.length > 0
    ? discussions.reduce((max, d) => (d.date > max ? d.date : max), '')
    : null

  return {
    upstream_id: pos.id,
    account: pos.account || '',
    coe: pos.coe || '',
    practice: pos.practice || '',
    stakeholder: pos.stakeholder || '',
    main_skill: pos.mainSkill || '',
    countries: pos.countries || '',
    seniorities: pos.seniorities || '',
    available_range: pos.availableRange || '',
    account_overview: detail?.comments ?? '',
    job_description: detail?.jobDescription ?? '',
    job_title: detail?.jobTitle ?? '',
    position_status: pos.status || 'Active',
    aging: pos.aging || 0,
    created: pos.created || null,
    ready_date: pos.readyDate || null,
    last_modification: pos.lastModification || null,
    sourcing: pos.sourcing || '',
    replacement: pos.replacement ? 1 : 0,
    vertical_industry: pos.verticalIndustry || '',
    in_office: detail?.inOffice ? 1 : 0,
    csu: detail?.csu ?? '',
    cs: detail?.cs ?? '',
    closed_date: pos.dateClosed ?? detail?.dateClosed ?? null,
    closed_reason: pos.closedReason || null,
    is_ready: detail?.isReady ? 1 : 0,
    is_promotion: detail?.isPromotion ? 1 : 0,
    maximum_rate: detail?.maximumRate ?? null,
    minimum_rate: detail?.minimumRate ?? null,
    additional_skills: JSON.stringify(detail?.additionalSkills ?? []),
    created_with_assignments_tool: detail?.createdWithAssignmentsTool == null ? null : detail.createdWithAssignmentsTool ? 1 : 0,
    candidates_presented: candidatesCount,
    last_discussion_date: latestDiscussionDate,
    status,
    status_reason: null,
    synced_at: new Date().toISOString(),
  }
}

/**
 * Build a synced open position entity for a retry scenario where the upstream
 * list data is not available — falls back to existing DB fields.
 */
export function buildRetryPositionEntity(
  upstreamId: number,
  detail: OpenPositionDetail,
  candidatesCount: number,
  discussions: DiscussionCommentItem[],
  existing: SyncedOpenPositionRow | null | undefined,
  fallbackName: string,
): Omit<SyncedOpenPositionRow, 'id'> {
  const latestDiscussionDate = discussions.length > 0
    ? discussions.reduce((max, d) => (d.date > max ? d.date : max), '')
    : null

  return {
    upstream_id: upstreamId,
    account: existing?.account ?? fallbackName,
    coe: existing?.coe ?? '',
    practice: existing?.practice ?? '',
    stakeholder: existing?.stakeholder ?? '',
    main_skill: existing?.main_skill ?? '',
    countries: existing?.countries ?? '',
    seniorities: existing?.seniorities ?? '',
    available_range: existing?.available_range ?? '',
    account_overview: detail.comments ?? '',
    job_description: detail.jobDescription ?? '',
    job_title: detail.jobTitle ?? '',
    position_status: existing?.position_status ?? 'Active',
    aging: existing?.aging ?? 0,
    created: existing?.created ?? null,
    ready_date: existing?.ready_date ?? null,
    last_modification: existing?.last_modification ?? null,
    sourcing: existing?.sourcing ?? '',
    replacement: existing?.replacement ?? 0,
    vertical_industry: existing?.vertical_industry ?? '',
    in_office: detail.inOffice ? 1 : 0,
    csu: detail.csu ?? '',
    cs: detail.cs ?? '',
    closed_date: detail.dateClosed ?? null,
    closed_reason: existing?.closed_reason ?? null,
    is_ready: detail.isReady ? 1 : 0,
    is_promotion: detail.isPromotion ? 1 : 0,
    maximum_rate: detail.maximumRate ?? null,
    minimum_rate: detail.minimumRate ?? null,
    additional_skills: JSON.stringify(detail.additionalSkills ?? []),
    created_with_assignments_tool: detail.createdWithAssignmentsTool == null ? null : detail.createdWithAssignmentsTool ? 1 : 0,
    candidates_presented: candidatesCount,
    last_discussion_date: latestDiscussionDate,
    status: 'synced',
    status_reason: null,
    synced_at: new Date().toISOString(),
  }
}

/**
 * Upsert candidates for an open position.
 * Shared between both orchestrators.
 */
export function upsertCandidates(
  matchRepository: { upsertOpenPositionCandidate: (data: Record<string, unknown>) => void },
  positionId: number,
  candidates: PresentedCandidateItem[],
): void {
  for (const cand of candidates) {
    matchRepository.upsertOpenPositionCandidate({
      open_position_id: positionId,
      candidate_requisition_id: cand.candidateRequisitionId,
      candidate_id: cand.candidateId,
      candidate_name: cand.candidate || '',
      main_skill: cand.skills || '',
      is_employee: cand.isEmployee ? 1 : 0,
      candidate_status: cand.candidateStatusName || '',
      rate: cand.rate ?? 0,
      start_date: cand.startDate || null,
      synced_at: new Date().toISOString(),
    })
  }
}

/**
 * Upsert discussion comments for an open position.
 * Shared between both orchestrators.
 */
export function upsertDiscussions(
  syncRepository: { upsertDiscussion: (data: Record<string, unknown>) => void },
  positionId: number,
  discussions: DiscussionCommentItem[],
): void {
  const syncedAt = new Date().toISOString()
  for (const comment of discussions) {
    syncRepository.upsertDiscussion({
      open_position_id: positionId,
      comment_id: comment.commentId,
      author: comment.author || '',
      date: comment.date || '',
      message: comment.message || '',
      parent_comment_id: comment.parentCommentId,
      synced_at: syncedAt,
    })
  }
}
