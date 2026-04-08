import { getConfig } from '../config'
import { createLogger } from './logger'

const log = createLogger('UpstreamApi')

interface ColumnDefinition {
  name: string
  label: string
  aggregate?: string
  dataType?: string
  dateDisplayFormat?: string
  dateOriginFormat?: string
  dateTimeDisplayFormat?: string
  dateTimeOriginFormat?: string
  isKey?: boolean
  isComputed?: boolean
  searchable?: boolean
  sortDirection?: string
  sortOrder?: number
  sortable?: boolean
  visible?: boolean
  filterOperator?: string
  filterText?: string
  filterable?: boolean
  exportable?: boolean
  filterArgument?: string[]
}

interface PagedRequest {
  columns: ColumnDefinition[]
  searchText?: string
  skip: number
  take: number
  counter?: number
  timezoneOffset?: number
}

interface PagedResponse {
  counter: number
  payload: unknown[][]
  filteredRecordCount: number
  totalPages: number
  currentPage: number
}

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

function getString(row: unknown[], i: number): string {
  if (i >= row.length || row[i] == null) return ''
  return String(row[i])
}

function getNullableString(row: unknown[], i: number): string | null {
  if (i >= row.length || row[i] == null) return null
  return String(row[i])
}

function getInt(row: unknown[], i: number): number {
  if (i >= row.length || row[i] == null) return 0
  const val = Number(row[i])
  return isNaN(val) ? 0 : Math.floor(val)
}

function getDecimal(row: unknown[], i: number): number {
  if (i >= row.length || row[i] == null) return 0
  const val = Number(row[i])
  return isNaN(val) ? 0 : val
}

function getBool(row: unknown[], i: number): boolean {
  if (i >= row.length) return false
  const val = row[i]
  if (val === true) return true
  if (val === false) return false
  if (typeof val === 'string') {
    const lower = val.toLowerCase()
    return lower === 'true' || lower === 'yes' || lower === '1'
  }
  return false
}

function getDateTime(row: unknown[], i: number): string {
  if (i >= row.length || row[i] == null) return ''
  return String(row[i])
}

function getNullableDateTime(row: unknown[], i: number): string | undefined {
  if (i >= row.length || row[i] == null) return undefined
  const val = String(row[i])
  return val || undefined
}

async function fetchAuthorized<T>(method: string, url: string, token: string, body?: unknown): Promise<T> {
  const start = Date.now()
  const options: RequestInit = {
    method,
    headers: {
      'x-sharepoint-token': token,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }

  const response = await fetch(url, options)
  if (!response.ok) {
    log.error(`Upstream API error: ${method} ${url}`, new Error(`${response.status} ${response.statusText}`), { status: response.status, method, durationMs: Date.now() - start })
    throw new Error(`Upstream API ${response.status}: ${response.statusText}`)
  }
  log.debug(`Upstream API OK: ${method} ${url}`, { status: response.status, durationMs: Date.now() - start })
  return response.json() as Promise<T>
}

async function fetchPaged(url: string, token: string, request: PagedRequest): Promise<PagedResponse> {
  const raw = await fetchAuthorized<Record<string, unknown>>('POST', url, token, request)
  const payload = (raw.payload ?? raw.Payload) as unknown[][] | undefined
  if (!payload || !Array.isArray(payload)) {
    log.warn('Invalid paged response — token may be expired', { url, hasPayload: !!raw.payload || !!raw.Payload })
    throw new Error('Invalid API response — token may be expired or unauthorized')
  }
  return {
    counter: (raw.counter ?? raw.Counter ?? 0) as number,
    payload,
    filteredRecordCount: (raw.filteredRecordCount ?? raw.FilteredRecordCount ?? 0) as number,
    totalPages: (raw.totalPages ?? raw.TotalPages ?? 0) as number,
    currentPage: (raw.currentPage ?? raw.CurrentPage ?? 0) as number,
  }
}

function col(name: string, label: string, overrides: Partial<ColumnDefinition> = {}): ColumnDefinition {
  return {
    name,
    label,
    aggregate: 'None',
    dataType: 'string',
    dateDisplayFormat: 'YYYY-MM-DD',
    dateOriginFormat: 'YYYY-MM-DD',
    dateTimeDisplayFormat: 'YYYY-MM-DDTHH:mm:ss',
    dateTimeOriginFormat: 'YYYY-MM-DDTHH:mm:ss',
    isKey: false,
    isComputed: false,
    searchable: false,
    sortDirection: 'None',
    sortOrder: -1,
    sortable: true,
    visible: true,
    filterOperator: 'Contains',
    filterable: true,
    exportable: true,
    ...overrides,
  }
}

function buildEmployeeColumns(): ColumnDefinition[] {
  return [
    col('UserId', 'User ID', { dataType: 'numeric', isKey: true, filterable: false, filterOperator: 'None', visible: false }),
    col('Active', 'Active', { filterOperator: 'Equals', filterText: 'Active', filterable: false, visible: false }),
    col('FullName', 'Name', { searchable: true, sortDirection: 'Ascending', sortOrder: 1 }),
    col('Email', 'E-mail', { searchable: true }),
    col('JobTitle', 'Job Title', { searchable: true }),
    col('MainSkill', 'Main Skill', { searchable: true }),
    col('AdditionalSkills', 'Additional Skills', { searchable: true, sortable: false }),
    col('FunctionalUnit', 'Functional Unit', { searchable: true }),
    col('Office', 'Office Location', { searchable: true }),
    col('ContractType', 'Contract Type', { searchable: true }),
    col('BusinessUnit', 'Business Unit', { searchable: true }),
    col('StartDate', 'Start Date', { dataType: 'datetimeutc' }),
    col('EnterpriseId', 'Enterprise ID', { searchable: true }),
    col('HrName', 'HR Partner', { searchable: true }),
    col('PeopleSuccessLead', 'People Success Lead', { searchable: true }),
    col('DateOfBirth', 'Date of Birth', { dataType: 'datetimeutc', sortable: false, filterable: false }),
    col('AnniversaryDate', 'Anniversary Date', { dataType: 'datetimeutc', sortable: false, filterable: false }),
    col('IsProjectBased', 'Is Project Based'),
  ]
}

function buildCandidateColumns(year?: number): ColumnDefinition[] {
  const statusUpdateColumn = col('StatusUpdate', 'Status Update', { dataType: 'datetimeutc' })

  if (year != null) {
    statusUpdateColumn.filterOperator = 'Between'
    if (year >= 2014) {
      statusUpdateColumn.filterText = `${year}-01-01T00:00:00.000Z`
      statusUpdateColumn.filterArgument = [`${year}-12-31T23:59:59.999Z`]
    } else {
      statusUpdateColumn.filterText = '2000-01-01T00:00:00.000Z'
      statusUpdateColumn.filterArgument = ['2013-12-31T23:59:59.999Z']
    }
  }

  return [
    col('CandidateId', 'Actions', { dataType: 'numeric', isKey: true, filterable: false, exportable: false, filterOperator: 'Equals' }),
    col('Candidate', 'Candidate', { searchable: true, sortDirection: 'Ascending', sortOrder: 1 }),
    col('Recruiter', 'Recruiter', { searchable: true }),
    col('CandidateStatusName', 'Status', { filterable: false }),
    col('JobBoard', 'Job Board'),
    col('Skills', 'Main Skill'),
    col('AdditionalSkills', 'Additional Skill'),
    col('Seniority', 'Seniority'),
    col('SeniorityBand', 'Seniority Band'),
    col('CoeCertifiedStatus', 'COE Certified Status'),
    col('MobilePhone', 'Mobile Phone'),
    col('Email', 'Email', { searchable: true }),
    col('SecondaryEmail', 'Secondary Email'),
    col('Location', 'Location'),
    statusUpdateColumn,
  ]
}

function buildRateColumns(): ColumnDefinition[] {
  return [
    col('Account', 'Account', { searchable: true, filterOperator: 'None' }),
    col('WorkOrderProjectName', 'Project Name', { searchable: true, filterOperator: 'None' }),
    col('Rate', 'Rate', { dataType: 'numeric', searchable: true, filterOperator: 'None' }),
    col('StartDate', 'Start Date', { dataType: 'date', searchable: true, sortDirection: 'Descending', sortOrder: 1, filterOperator: 'None' }),
  ]
}

function buildNoteColumns(): ColumnDefinition[] {
  return [
    col('PersonaNoteId', 'Note ID', { dataType: 'numeric', isKey: true, filterable: false, filterOperator: 'None', visible: false }),
    col('NoteTypeName', 'Type', { searchable: true }),
    col('NoteContent', 'Content', { searchable: true }),
    col('FullName', 'Name', { searchable: true }),
    col('DateCreated', 'Created', { dataType: 'datetimeutc' }),
    col('Filename', 'File', { searchable: true }),
  ]
}

function buildOpenPositionColumns(): ColumnDefinition[] {
  return [
    col('RecruitmentRequisitionId', 'Actions', { filterable: false, exportable: false, sortable: false, filterOperator: 'None' }),
    col('Id', 'Id', { dataType: 'numeric', isKey: true, sortDirection: 'Ascending', sortOrder: 2, filterOperator: 'None' }),
    col('Account', 'Account', { searchable: true, sortDirection: 'Ascending', sortOrder: 1, filterOperator: 'None' }),
    col('VerticalIndustry', 'Vertical Industry', { searchable: true, filterOperator: 'None' }),
    col('CoE', 'CoE', { searchable: true, filterOperator: 'None' }),
    col('Practice', 'Practice', { searchable: true, filterOperator: 'None' }),
    col('Stakeholder', 'Stakeholder', { searchable: true, filterOperator: 'None' }),
    col('MainSkill', 'Main Skill', { searchable: true, filterOperator: 'None' }),
    col('Status', 'Status', { searchable: true, filterOperator: 'None' }),
    col('Countries', 'Countries', { searchable: true, filterOperator: 'None' }),
    col('InOffice', 'In Office', { dataType: 'boolean', filterOperator: 'None' }),
    col('Csu', 'CSU', { searchable: true, filterOperator: 'None' }),
    col('PositionStatus', 'Count', { filterable: false, filterOperator: 'None' }),
    col('Aging', 'Aging', { dataType: 'numeric', filterable: false, filterOperator: 'None' }),
    col('Seniorities', 'Seniorities', { searchable: true, filterOperator: 'None' }),
    col('RateRange', 'Available Range', { filterOperator: 'None' }),
    col('Created', 'Created', { dataType: 'date', filterOperator: 'None' }),
    col('StartDate', 'Ready Date', { dataType: 'date', filterOperator: 'None' }),
    col('LastStatus', 'Last Modification', { dataType: 'date', filterOperator: 'None' }),
    col('Sourcing', 'Sourcing', { searchable: true, filterOperator: 'None' }),
    col('Replacement', 'Replacement', { dataType: 'boolean', filterOperator: 'None' }),
    col('Closed', 'Closed', { dataType: 'date', filterOperator: 'None' }),
    col('IsFromAssignments', 'Is From Assignments', { dataType: 'boolean', sortable: false, visible: false, filterOperator: 'None' }),
  ]
}

function buildPresentedCandidateColumns(): ColumnDefinition[] {
  return [
    col('CandidateRequisitionId', 'Actions', { dataType: 'numeric', isKey: true, filterable: false, exportable: false, sortable: false, filterOperator: 'None' }),
    col('Candidate', 'Candidate', { searchable: true, filterOperator: 'None' }),
    col('CandidateStatusName', 'Status', { searchable: true, filterOperator: 'None' }),
    col('StartDate', 'Status Date', { dataType: 'date', sortDirection: 'Descending', sortOrder: 1, filterOperator: 'None' }),
    col('Skills', 'Main Skill', { searchable: true, filterOperator: 'None' }),
    col('Rate', 'Rate', { dataType: 'numeric', searchable: true, filterOperator: 'None' }),
    col('Visa', 'Employee', { dataType: 'boolean', filterOperator: 'None' }),
    col('Skype', 'Rec Status', { searchable: true, filterOperator: 'None' }),
    col('CandidateId', 'Candidate Id', { dataType: 'numeric', filterable: false, visible: false, filterOperator: 'None' }),
  ]
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
  async getEmployeesPaged(token: string, skip: number, take: number): Promise<{ items: EmployeeDetail[]; totalRecords: number }> {
    const { upstream } = getConfig()
    const paged = await fetchPaged(`${upstream.apiUrl}employee/paged`, token, {
      skip, take, columns: buildEmployeeColumns(),
    })
    const items = paged.payload.map(row => ({
      userId: getInt(row, 0),
      fullName: getString(row, 2),
      email: getString(row, 3),
      jobTitle: getString(row, 4),
      mainSkillName: getString(row, 5),
      officeName: getString(row, 8),
      seniority: 0,
      mainSkillId: 0,
      countryId: 0,
      accountName: '',
    }))
    log.debug('getEmployeesPaged', { skip, take, resultCount: items.length, totalRecords: paged.filteredRecordCount })
    return { items, totalRecords: paged.filteredRecordCount }
  },

  async getEmployeeDetail(token: string, id: number): Promise<EmployeeDetail> {
    const { upstream } = getConfig()
    try {
      return await fetchAuthorized<EmployeeDetail>('GET', `${upstream.apiUrl}employee/get/${id}`, token)
    } catch (err) {
      log.error(`getEmployeeDetail failed for id=${id}`, err instanceof Error ? err : new Error(String(err)), { upstreamId: id })
      throw err
    }
  },

  async getEmployeeContracts(token: string, id: number): Promise<EmployeeContract[]> {
    const { upstream } = getConfig()
    try {
      return await fetchAuthorized<EmployeeContract[]>('GET', `${upstream.apiUrl}contract/${id}`, token)
    } catch (err) {
      log.error(`getEmployeeContracts failed for id=${id}`, err instanceof Error ? err : new Error(String(err)), { upstreamId: id })
      throw err
    }
  },

  async getEmployeeRates(token: string, id: number): Promise<EmployeeRate[]> {
    const { upstream } = getConfig()
    try {
      const paged = await fetchPaged(`${upstream.apiUrl}employee/${id}/rate`, token, {
        skip: 0, take: 100, counter: 3, columns: buildRateColumns(),
      })
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

  async getEmployeeNotes(token: string, id: number): Promise<PersonaNote[]> {
    const { upstream } = getConfig()
    try {
      const paged = await fetchPaged(`${upstream.apiUrl}personanote/pagedByUser/${id}`, token, {
        skip: 0, take: 100, columns: buildNoteColumns(),
      })
      return mapNoteRows(paged)
    } catch (err) {
      log.error(`getEmployeeNotes failed for id=${id}`, err instanceof Error ? err : new Error(String(err)), { upstreamId: id })
      throw err
    }
  },

  async getCandidatesPaged(token: string, skip: number, take: number, year?: number): Promise<{ items: CandidateDetail[]; totalRecords: number }> {
    const { upstream } = getConfig()
    const paged = await fetchPaged(`${upstream.apiUrl}Candidate/paged`, token, {
      skip, take, columns: buildCandidateColumns(year),
    })
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

  async getCandidateDetail(token: string, id: number): Promise<CandidateDetail> {
    const { upstream } = getConfig()
    try {
      return await fetchAuthorized<CandidateDetail>('GET', `${upstream.apiUrl}Candidate/${id}`, token)
    } catch (err) {
      log.error(`getCandidateDetail failed for id=${id}`, err instanceof Error ? err : new Error(String(err)), { upstreamId: id })
      throw err
    }
  },

  async getCandidateNotes(token: string, id: number): Promise<PersonaNote[]> {
    const { upstream } = getConfig()
    try {
      const paged = await fetchPaged(`${upstream.apiUrl}personanote/pagedByCandidate/${id}`, token, {
        skip: 0, take: 100, columns: buildNoteColumns(),
      })
      return mapNoteRows(paged)
    } catch (err) {
      log.error(`getCandidateNotes failed for id=${id}`, err instanceof Error ? err : new Error(String(err)), { upstreamId: id })
      throw err
    }
  },

  async getNoteFile(token: string, noteId: number): Promise<ArrayBuffer> {
    const { upstream } = getConfig()
    const response = await fetch(`${upstream.apiUrl}personanote/file/${noteId}`, {
      headers: { 'x-sharepoint-token': token },
    })
    if (!response.ok) throw new Error(`Note file download failed: ${response.status}`)
    return response.arrayBuffer()
  },

  async getOpenPositionsPaged(token: string, skip: number, take: number): Promise<{ items: OpenPositionListItem[]; totalRecords: number }> {
    const { upstream } = getConfig()
    const paged = await fetchPaged(`${upstream.apiUrl}op/paged/true/1/`, token, {
      skip, take, columns: buildOpenPositionColumns(),
    })
    const items = paged.payload.map(row => ({
      id: getInt(row, 1),
      account: getString(row, 2),
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
    }))
    return { items, totalRecords: paged.filteredRecordCount }
  },

  async getOpenPositionDetail(token: string, id: number): Promise<OpenPositionDetail | null> {
    const { upstream } = getConfig()
    try {
      return await fetchAuthorized<OpenPositionDetail>('GET', `${upstream.apiUrl}op/${id}`, token)
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

  async savePersonaNote(token: string, personId: number, noteType: string, fileName: string, fileContent: ArrayBuffer): Promise<number> {
    const { upstream } = getConfig()
    const formData = new FormData()
    formData.append('PersonId', personId.toString())
    formData.append('NoteTypeName', noteType)
    formData.append('File', new Blob([fileContent]), fileName)

    const response = await fetch(`${upstream.apiUrl}personanote/save`, {
      method: 'POST',
      headers: { 'x-sharepoint-token': token },
      body: formData,
    })
    if (!response.ok) throw new Error(`Save note failed: ${response.status}`)
    const result = await response.json() as { personaNoteId?: number }
    return result.personaNoteId ?? 0
  },
}
