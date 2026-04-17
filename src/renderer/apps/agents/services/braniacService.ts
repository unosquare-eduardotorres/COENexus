import type {
  BraniacRunParams,
  BraniacCancelParams,
  BraniacListJobsParams,
  BraniacListPatternsParams,
  BraniacListProfilesParams,
  BraniacGetProfileParams,
  AgentStepEvent,
  BraniacStatusEvent,
} from '../../../../shared/ipc-types'

export const braniacService = {
  run: (params: BraniacRunParams) => window.api.braniac.run(params),
  cancel: (params: BraniacCancelParams) => window.api.braniac.cancel(params),
  getStatus: () => window.api.braniac.getStatus(),
  listJobs: (params?: BraniacListJobsParams) => window.api.braniac.listJobs(params),
  getJob: (jobId: string) => window.api.braniac.getJob(jobId),
  listPatterns: (params?: BraniacListPatternsParams) => window.api.braniac.listPatterns(params),
  listProfiles: (params?: BraniacListProfilesParams) => window.api.braniac.listProfiles(params),
  getProfile: (params: BraniacGetProfileParams) => window.api.braniac.getProfile(params),
  getAccounts: () => window.api.braniac.getAccounts(),
  onStepEvent: (cb: (data: AgentStepEvent) => void) => window.api.braniac.onStepEvent(cb),
  onStatusEvent: (cb: (data: BraniacStatusEvent) => void) => window.api.braniac.onStatusEvent(cb),
}
