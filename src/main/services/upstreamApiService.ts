import { getConfig } from '../config'
import { createLogger } from './logger'
import { fetchAuthorized, fetchPaged, type PagedResponse } from './upstream/upstreamApiClient'
import { getString, getNullableString, getInt, getDecimal, getBool, getDateTime, getNullableDateTime } from './upstream/upstreamRowParsers'
import { buildEmployeeColumns, buildCandidateColumns, buildRateColumns, buildNoteColumns, buildOpenPositionColumns, buildPresentedCandidateColumns, buildPrrColumns, buildPrrPresentationColumns, buildTeamCompositionColumns, buildBenchColumns } from './upstream/upstreamColumnDefs'
import { mapKeysToCamelCase } from './upstream/caseMapper'

export type { ColumnDefinition, PagedRequest, PagedResponse } from './upstream/upstreamApiClient'

const log = createLogger('UpstreamApi')

export interface EmployeeDetail {
  userId: number
  fullName: string
  email: string
  seniority: number
  mainSkillId: number
  countryId: number
  accountName: string
  jobTitle: string
  mainSkillName: string
  officeName: string
  functionalUnit: string
  businessUnit: string
}

export interface EmployeeContract {
  salary: number
  currencyCode: string
  startDate: string
  netSalary: number | null
  annualCost: number | null
}

export interface EmployeeRate {
  accountName: string
  projectName: string
  rate: number
  startDate: string
}

export interface CandidateDetail {
  candidateId: number
  firstName?: string
  lastName?: string
  fullName: string
  email?: string
  seniority?: number
  mainSkillId?: number
  countryId?: number
  coeCertifiedStatusId?: number
  statusUpdate?: string
  currentSalary?: number
  currentSalaryCurrency?: string
  desiredSalary?: string
  desiredSalaryCurrency?: string
  offer?: number
  mainSkill?: string
  country?: string
  seniorityText?: string
  coeCertifiedStatus?: string
  candidateStatusName?: string
  salaryCurrency?: string
}

export interface OpenPositionListItem {
  id: number
  account: string
  verticalIndustry: string
  coe: string
  practice: string
  stakeholder: string
  mainSkill: string
  countries: string
  seniorities: string
  availableRange: string
  status: string
  aging: number
  created: string
  readyDate: string
  lastModification: string
  sourcing: string
  replacement: boolean
  candidatesPresented: number
  lastDiscussionDate: string
  closedReason: string
  dateClosed: string | null
}

export interface OpenPositionDetail {
  recruitmentRequisitionId: number
  jobDescription: string
  companyName: string
  jobTitle: string
  mainSkillId: number
  mainSkillName: string
  seniorities: number[]
  countries: number[]
  seniority: string
  research: string
  active: string
  maximumRate: number | null
  minimumRate: number | null
  comments: string | null
  inOffice: boolean
  isReady: boolean
  isPromotion: boolean
  csu: string
  cs: string
  dateClosed: string | null
  additionalSkills: Array<{ tagId: number; tagName: string }>
  createdWithAssignmentsTool: boolean | null
}

export interface DiscussionCommentItem {
  commentId: number
  author: string
  date: string
  message: string
  parentCommentId: number | null
}

export interface PersonaNote {
  personaNoteId: number
  noteTypeName: string
  noteContent: string
  fullName: string
  dateCreated: string
  filename: string | null
}

export interface PresentedCandidateItem {
  candidateRequisitionId: number
  candidate: string
  candidateStatusName: string
  startDate: string
  skills: string
  rate: number | null
  isEmployee: boolean
  candidateId: number
}

export interface CandidateRequisitionDetailItem {
  candidateRequisitionId: number
  candidateFullName: string
  requisitionName: string
  requisitionStatus: number
  requisitionStatusId: number
  listFeedback: number[]
  comments: string
  rate: number
  actionDate: string
}

export interface PrrListItem {
  id: number
  employee: string
  account: string
  team: string
  mainSkill: string
  seniority: string
  transitionStatus: string
  transitionSubType: string
  location: string
  requestDate: string
  daysSinceLastInterview: string
  impact: string
  attritionRisk: string
  comments: string
}

export interface PrrPresentationItem {
  openPositionId: number
  account: string
  openPositionStatus: string
  location: string
  presentedOn: string
  candidateStatus: string
}

export interface TeamCompositionEntry {
  account: string
  team: string
  project: string
  role: string
  startDate: string
  endDate: string | null
}

function mapNoteRows(paged: PagedResponse): PersonaNote[] {
  return paged.payload.map(row => ({
    personaNoteId: getInt(row, 0),
    noteTypeName: getString(row, 1),
    noteContent: getString(row, 2),
    fullName: getString(row, 3),
    dateCreated: getDateTime(row, 4),
    filename: getNullableString(row, 5),
  }))
}

export const upstreamApiService = {
  async getEmployeesPaged(token: string, skip: number, take: number, signal?: AbortSignal): Promise<{ items: EmployeeDetail[]; totalRecords: number }> {
    const { upstream } = getConfig()
    const paged = await fetchPaged(`${upstream.apiUrl}employee/paged`, token, {
      skip, take, columns: buildEmployeeColumns(),
    }, signal)
    const items = paged.payload.map(row => ({
      userId: getInt(row, 0),
      fullName: getString(row, 2),
      email: getString(row, 3),
      jobTitle: getString(row, 4),
      mainSkillName: getString(row, 5),
      functionalUnit: getString(row, 7),
      officeName: getString(row, 8),
      businessUnit: getString(row, 10),
      seniority: 0,
      mainSkillId: 0,
      countryId: 0,
      accountName: '',
    }))
    log.debug('getEmployeesPaged', { skip, take, resultCount: items.length, totalRecords: paged.filteredRecordCount })
    return { items, totalRecords: paged.filteredRecordCount }
  },

  async getEmployeeDetail(token: string, id: number, signal?: AbortSignal): Promise<EmployeeDetail> {
    const { upstream } = getConfig()
    try {
      const raw = await fetchAuthorized<Record<string, unknown>>('GET', `${upstream.apiUrl}employee/get/${id}`, token, undefined, signal)
      return mapKeysToCamelCase<EmployeeDetail>(raw)
    } catch (err) {
      log.error(`getEmployeeDetail failed for id=${id}`, err instanceof Error ? err : new Error(String(err)), { upstreamId: id })
      throw err
    }
  },

  async getEmployeeContracts(token: string, id: number, signal?: AbortSignal): Promise<EmployeeContract[]> {
    const { upstream } = getConfig()
    try {
      const raw = await fetchAuthorized<Record<string, unknown>[]>('GET', `${upstream.apiUrl}contract/${id}`, token, undefined, signal)
      return Array.isArray(raw) ? raw.map(item => mapKeysToCamelCase<EmployeeContract>(item)) : []
    } catch (err) {
      log.error(`getEmployeeContracts failed for id=${id}`, err instanceof Error ? err : new Error(String(err)), { upstreamId: id })
      throw err
    }
  },

  async getEmployeeRates(token: string, id: number, signal?: AbortSignal): Promise<EmployeeRate[]> {
    const { upstream } = getConfig()
    try {
      const paged = await fetchPaged(`${upstream.apiUrl}employee/${id}/rate`, token, {
        skip: 0, take: 100, counter: 3, columns: buildRateColumns(),
      }, signal)
      return paged.payload.map(row => ({
        accountName: getString(row, 0),
        projectName: getString(row, 1),
        rate: getDecimal(row, 2),
        startDate: getString(row, 3),
      }))
    } catch (err) {
      log.error(`getEmployeeRates failed for id=${id}`, err instanceof Error ? err : new Error(String(err)), { upstreamId: id })
      throw err
    }
  },

  async getEmployeeNotes(token: string, id: number, signal?: AbortSignal): Promise<PersonaNote[]> {
    const { upstream } = getConfig()
    try {
      const paged = await fetchPaged(`${upstream.apiUrl}personanote/pagedByUser/${id}`, token, {
        skip: 0, take: 100, columns: buildNoteColumns(),
      }, signal)
      return mapNoteRows(paged)
    } catch (err) {
      log.error(`getEmployeeNotes failed for id=${id}`, err instanceof Error ? err : new Error(String(err)), { upstreamId: id })
      throw err
    }
  },

  async getEmployeeTeamComposition(token: string, id: number, signal?: AbortSignal): Promise<TeamCompositionEntry[]> {
    const { upstream } = getConfig()
    try {
      const paged = await fetchPaged(`${upstream.apiUrl}employee/${id}/composition`, token, {
        skip: 0, take: 100, columns: buildTeamCompositionColumns(),
      }, signal)
      return paged.payload.map(row => ({
        account: getString(row, 0),
        team: getString(row, 1),
        project: getString(row, 2),
        role: getString(row, 3),
        startDate: getString(row, 4),
        endDate: getNullableString(row, 5),
      }))
    } catch (err) {
      log.error(`getEmployeeTeamComposition failed for id=${id}`, err instanceof Error ? err : new Error(String(err)), { upstreamId: id })
      throw err
    }
  },

  async getCandidatesPaged(token: string, skip: number, take: number, year?: number, signal?: AbortSignal): Promise<{ items: CandidateDetail[]; totalRecords: number }> {
    const { upstream } = getConfig()
    const paged = await fetchPaged(`${upstream.apiUrl}Candidate/paged`, token, {
      skip, take, columns: buildCandidateColumns(year),
    }, signal)
    const items = paged.payload.map(row => ({
      candidateId: getInt(row, 0),
      fullName: getString(row, 1),
      candidateStatusName: getNullableString(row, 3) ?? undefined,
      email: getString(row, 11),
      mainSkill: getString(row, 5),
      seniorityText: getString(row, 7),
      country: getString(row, 13),
      coeCertifiedStatus: getNullableString(row, 9) ?? undefined,
      statusUpdate: getNullableDateTime(row, 14),
    }))
    log.debug('getCandidatesPaged', { skip, take, year, resultCount: items.length, totalRecords: paged.filteredRecordCount })
    return { items, totalRecords: paged.filteredRecordCount }
  },

  async getCandidateDetail(token: string, id: number, signal?: AbortSignal): Promise<CandidateDetail> {
    const { upstream } = getConfig()
    try {
      const raw = await fetchAuthorized<Record<string, unknown>>('GET', `${upstream.apiUrl}Candidate/${id}`, token, undefined, signal)
      return mapKeysToCamelCase<CandidateDetail>(raw)
    } catch (err) {
      log.error(`getCandidateDetail failed for id=${id}`, err instanceof Error ? err : new Error(String(err)), { upstreamId: id })
      throw err
    }
  },

  async getCandidateNotes(token: string, id: number, signal?: AbortSignal): Promise<PersonaNote[]> {
    const { upstream } = getConfig()
    try {
      const paged = await fetchPaged(`${upstream.apiUrl}personanote/pagedByCandidate/${id}`, token, {
        skip: 0, take: 100, columns: buildNoteColumns(),
      }, signal)
      return mapNoteRows(paged)
    } catch (err) {
      log.error(`getCandidateNotes failed for id=${id}`, err instanceof Error ? err : new Error(String(err)), { upstreamId: id })
      throw err
    }
  },

  async getNoteFile(token: string, noteId: number, signal?: AbortSignal): Promise<ArrayBuffer> {
    const { upstream } = getConfig()
    try {
      const response = await fetch(`${upstream.apiUrl}personanote/file/${noteId}`, {
        headers: { 'x-sharepoint-token': token },
        signal,
      })
      if (!response.ok) throw new Error(`Note file download failed: ${response.status}`)
      return response.arrayBuffer()
    } catch (err) {
      log.error(`getNoteFile failed for noteId=${noteId}`, err instanceof Error ? err : new Error(String(err)), { noteId })
      throw err
    }
  },

  async getOpenPositionsPaged(token: string, skip: number, take: number): Promise<{ items: OpenPositionListItem[]; totalRecords: number }> {
    const { upstream } = getConfig()
    const paged = await fetchPaged(`${upstream.apiUrl}op/paged/true/1/`, token, {
      skip, take, columns: buildOpenPositionColumns(),
    })
    const items = paged.payload.map(row => ({
      id: getInt(row, 1),
      account: getString(row, 2),
      verticalIndustry: getString(row, 3),
      coe: getString(row, 4),
      practice: getString(row, 5),
      stakeholder: getString(row, 6),
      mainSkill: getString(row, 7),
      status: getString(row, 8),
      countries: getString(row, 9),
      aging: row.length > 13 ? getInt(row, 13) : 0,
      seniorities: row.length > 14 ? getString(row, 14) : '',
      availableRange: row.length > 15 ? getString(row, 15) : '',
      created: row.length > 16 ? getString(row, 16) : '',
      readyDate: row.length > 17 ? getString(row, 17) : '',
      lastModification: row.length > 18 ? getString(row, 18) : '',
      sourcing: row.length > 19 ? getString(row, 19) : '',
      replacement: row.length > 20 && getBool(row, 20),
      candidatesPresented: row.length > 21 ? getInt(row, 21) : 0,
      lastDiscussionDate: row.length > 22 ? getString(row, 22) : '',
      closedReason: row.length > 23 ? getString(row, 23) : '',
      dateClosed: row.length > 21 ? getNullableString(row, 21) : null,
    }))
    log.debug('getOpenPositionsPaged', { skip, take, resultCount: items.length, totalRecords: paged.filteredRecordCount })
    return { items, totalRecords: paged.filteredRecordCount }
  },

  async getAllOpenPositionsPaged(token: string, skip: number, take: number, year?: number): Promise<{ items: OpenPositionListItem[]; totalRecords: number }> {
    const { upstream } = getConfig()
    const paged = await fetchPaged(`${upstream.apiUrl}op/paged/false//`, token, {
      skip, take, columns: buildOpenPositionColumns(year),
    })
    const items = paged.payload.map(row => ({
      id: getInt(row, 1),
      account: getString(row, 2),
      verticalIndustry: getString(row, 3),
      coe: getString(row, 4),
      practice: getString(row, 5),
      stakeholder: getString(row, 6),
      mainSkill: getString(row, 7),
      status: getString(row, 8),
      countries: getString(row, 9),
      aging: row.length > 13 ? getInt(row, 13) : 0,
      seniorities: row.length > 14 ? getString(row, 14) : '',
      availableRange: row.length > 15 ? getString(row, 15) : '',
      created: row.length > 16 ? getString(row, 16) : '',
      readyDate: row.length > 17 ? getString(row, 17) : '',
      lastModification: row.length > 18 ? getString(row, 18) : '',
      sourcing: row.length > 19 ? getString(row, 19) : '',
      replacement: row.length > 20 && getBool(row, 20),
      candidatesPresented: row.length > 21 ? getInt(row, 21) : 0,
      lastDiscussionDate: row.length > 22 ? getString(row, 22) : '',
      closedReason: row.length > 23 ? getString(row, 23) : '',
      dateClosed: row.length > 21 ? getNullableString(row, 21) : null,
    }))
    log.debug('getAllOpenPositionsPaged', { skip, take, year, resultCount: items.length, totalRecords: paged.filteredRecordCount })
    return { items, totalRecords: paged.filteredRecordCount }
  },

  async getOpenPositionDetail(token: string, id: number): Promise<OpenPositionDetail | null> {
    const { upstream } = getConfig()
    try {
      const raw = await fetchAuthorized<Record<string, unknown>>('GET', `${upstream.apiUrl}op/${id}`, token)
      return mapKeysToCamelCase<OpenPositionDetail>(raw)
    } catch (err) {
      log.error(`Failed to fetch open position detail for ${id}`, err instanceof Error ? err : new Error(String(err)))
      return null
    }
  },

  async getPresentedCandidates(token: string, positionId: number): Promise<PresentedCandidateItem[]> {
    const { upstream } = getConfig()
    try {
      const paged = await fetchPaged(`${upstream.apiUrl}op/pagedRequisition/${positionId}`, token, {
        skip: 0, take: 100, columns: buildPresentedCandidateColumns(),
      })
      return paged.payload.map(row => ({
        candidateRequisitionId: getInt(row, 0),
        candidate: getString(row, 1),
        candidateStatusName: getString(row, 2),
        startDate: getString(row, 3),
        skills: getString(row, 4),
        rate: row.length > 5 ? getDecimal(row, 5) : null,
        isEmployee: getBool(row, 6),
        candidateId: row.length > 8 ? getInt(row, 8) : 0,
      }))
    } catch (err) {
      log.error(`Failed to fetch presented candidates for position ${positionId}`, err instanceof Error ? err : new Error(String(err)))
      return []
    }
  },

  async getDiscussionComments(token: string, positionId: number): Promise<DiscussionCommentItem[]> {
    try {
      const url = `https://unocorpdiskus.azurewebsites.net/comments?topicCode=${positionId}&topicName=OPEN_POSITION`
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (!response.ok) {
        log.warn(`Discussion API returned ${response.status} for position ${positionId}`)
        return []
      }
      const data = await response.json() as { comments?: Array<{ CommentId: number; Email: string; Comment: string; ParentCommentId: number | null; CreationDate: string }> }
      return (data.comments ?? []).map(c => ({
        commentId: c.CommentId,
        author: c.Email,
        date: c.CreationDate,
        message: c.Comment,
        parentCommentId: c.ParentCommentId,
      }))
    } catch (err) {
      log.error(`Failed to fetch discussion comments for position ${positionId}`, err instanceof Error ? err : new Error(String(err)))
      return []
    }
  },

  async getCandidateRequisitionDetail(token: string, candidateRequisitionId: number): Promise<CandidateRequisitionDetailItem | null> {
    const { upstream } = getConfig()
    try {
      const raw = await fetchAuthorized<Record<string, unknown>>(
        'GET',
        `${upstream.apiUrl}op/candidate/${candidateRequisitionId}`,
        token
      )
      return mapKeysToCamelCase<CandidateRequisitionDetailItem>(raw)
    } catch (err) {
      log.error(`Failed to fetch candidate requisition detail for ${candidateRequisitionId}`, err instanceof Error ? err : new Error(String(err)))
      return null
    }
  },

  async savePersonaNote(token: string, personId: number, noteType: string, fileName: string, fileContent: ArrayBuffer): Promise<number> {
    const { upstream } = getConfig()
    const formData = new FormData()
    formData.append('PersonId', personId.toString())
    formData.append('NoteTypeName', noteType)
    formData.append('File', new Blob([fileContent]), fileName)

    try {
      const response = await fetch(`${upstream.apiUrl}personanote/save`, {
        method: 'POST',
        headers: { 'x-sharepoint-token': token },
        body: formData,
      })
      if (!response.ok) throw new Error(`Save note failed: ${response.status}`)
      const raw = await response.json() as Record<string, unknown>
      const result = mapKeysToCamelCase<{ personaNoteId?: number }>(raw)
      const noteId = result.personaNoteId ?? 0
      log.info('savePersonaNote succeeded', { personId, noteType, fileName, noteId })
      return noteId
    } catch (err) {
      log.error(`savePersonaNote failed for personId=${personId}`, err instanceof Error ? err : new Error(String(err)), { personId, noteType, fileName })
      throw err
    }
  },

  async getPrrsPaged(token: string, skip: number, take: number): Promise<{ items: PrrListItem[]; totalRecords: number }> {
    const { upstream } = getConfig()
    const paged = await fetchPaged(
      `${upstream.apiUrl}ProjectTransition/paged?ProjectTransitionType=3&active=true`,
      token,
      { skip, take, columns: buildPrrColumns() }
    )
    const items = paged.payload.map(row => ({
      id: getInt(row, 0),
      employee: getString(row, 1),
      account: getString(row, 2),
      team: getString(row, 3),
      mainSkill: getString(row, 4),
      seniority: getString(row, 5),
      transitionStatus: getString(row, 6),
      transitionSubType: getString(row, 7),
      location: getString(row, 8),
      requestDate: getDateTime(row, 9),
      daysSinceLastInterview: getString(row, 10),
      impact: getString(row, 11),
      attritionRisk: getString(row, 12),
      comments: getString(row, 13),
    }))
    log.debug('getPrrsPaged', { skip, take, resultCount: items.length, totalRecords: paged.filteredRecordCount })
    return { items, totalRecords: paged.filteredRecordCount }
  },

  async getPrrPresentations(token: string, prrId: number): Promise<PrrPresentationItem[]> {
    const { upstream } = getConfig()
    try {
      const paged = await fetchPaged(
        `${upstream.apiUrl}projectTransition/presentations/${prrId}`,
        token,
        { skip: 0, take: 100, columns: buildPrrPresentationColumns(), counter: 1 }
      )
      return paged.payload.map(row => ({
        openPositionId: getInt(row, 0),
        account: getString(row, 1),
        openPositionStatus: getString(row, 2),
        location: getString(row, 3),
        presentedOn: getString(row, 4),
        candidateStatus: getString(row, 5),
      }))
    } catch (err) {
      log.error(`Failed to fetch PRR presentations for ${prrId}`, err instanceof Error ? err : new Error(String(err)))
      return []
    }
  },

  async getBenchEmployeeIds(token: string, signal?: AbortSignal): Promise<Set<number>> {
    const { upstream } = getConfig()
    const benchIds = new Set<number>()
    let skip = 0
    const take = 500

    try {
      while (true) {
        if (signal?.aborted) break
        const paged = await fetchPaged(
          `${upstream.apiUrl}Bench/paged/true`, token,
          { skip, take, columns: buildBenchColumns() }, signal
        )
        for (const row of paged.payload) {
          const userId = getInt(row, 0)
          if (userId > 0) benchIds.add(userId)
        }
        skip += paged.payload.length
        if (skip >= paged.filteredRecordCount || paged.payload.length === 0) break
      }
      log.info('Bench employee IDs loaded from upstream', { count: benchIds.size })
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') throw err
      log.warn('Failed to load bench employee IDs from upstream — falling back to composition-only detection', {
        error: err instanceof Error ? err.message : String(err),
        partialCount: benchIds.size,
      })
    }
    return benchIds
  },
}
