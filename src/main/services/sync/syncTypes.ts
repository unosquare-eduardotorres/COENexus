interface BaseSyncRecord {
  id: string
  source: string
  status: string
  name: string
  email: string
  hasResume: boolean
  isBench: boolean
  resumeChanged: boolean
  upstreamId: number
  failed: boolean
  syncDetail?: string
  syncedAt: string
  resumeDateCreated?: string | null
  reason?: string | null
}

export interface EmployeeSyncRecord extends BaseSyncRecord {
  source: 'employees'
  seniority: string
  mainSkill: string
  country: string
  grossMonthlySalary?: number | null
  expectedRate?: number | null
  currency?: string | null
  lastAccount?: string | null
  lastAccountStartDate?: string | null
  jobTitle?: string
}

export interface CandidateSyncRecord extends BaseSyncRecord {
  source: 'candidates'
  seniority?: string
  mainSkill?: string
  country?: string
  grossMonthlySalary?: number | null
  currency?: string | null
  coeCertified?: boolean
  candidateStatus?: string | null
  lastStatusUpdate?: string | null
  salaryExpectations?: number | null
  salaryExpectationsCurrency?: string | null
}

export interface PositionSyncRecord extends BaseSyncRecord {
  source: 'open-positions'
  account?: string | null
  coe?: string | null
  practice?: string | null
  stakeholder?: string | null
  countries?: string | null
  seniorities?: string | null
  availableRange?: string | null
  positionStatus?: string | null
  aging?: number | null
  hasJobDescription?: boolean
  candidatesCount?: number
  mainSkill?: string
}

export type SyncRecordDto = EmployeeSyncRecord | CandidateSyncRecord | PositionSyncRecord

export interface SyncProgressDto {
  totalRecords: number
  fetchedRecords: number
  syncedCount: number
  incompleteCount: number
  notProcessedCount: number
  updatedCount: number
  unchangedCount: number
  skippedCount: number
  currentRecord?: string
  status: string
}

export type SyncEvent =
  | { type: 'record'; record: SyncRecordDto }
  | { type: 'progress'; progress: SyncProgressDto }
  | { type: 'complete'; progress: SyncProgressDto }
  | { type: 'error'; message: string }

export interface SyncOptions {
  limit?: number
  skip?: number
  year?: number
}
