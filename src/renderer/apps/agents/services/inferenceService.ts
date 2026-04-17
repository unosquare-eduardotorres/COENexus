import type {
  InferenceRunParams,
  InferenceCancelParams,
  InferenceListJobsParams,
  InferenceListPatternsParams,
  InferenceListProfilesParams,
  InferenceGetProfileParams,
  AgentStepEvent,
  InferenceStatusEvent,
} from '../../../../shared/ipc-types'

export const inferenceService = {
  run: (params: InferenceRunParams) => window.api.inference.run(params),
  cancel: (params: InferenceCancelParams) => window.api.inference.cancel(params),
  getStatus: () => window.api.inference.getStatus(),
  listJobs: (params?: InferenceListJobsParams) => window.api.inference.listJobs(params),
  getJob: (jobId: string) => window.api.inference.getJob(jobId),
  listPatterns: (params?: InferenceListPatternsParams) => window.api.inference.listPatterns(params),
  listProfiles: (params?: InferenceListProfilesParams) => window.api.inference.listProfiles(params),
  getProfile: (params: InferenceGetProfileParams) => window.api.inference.getProfile(params),
  getAccounts: () => window.api.inference.getAccounts(),
  onStepEvent: (cb: (data: AgentStepEvent) => void) => window.api.inference.onStepEvent(cb),
  onStatusEvent: (cb: (data: InferenceStatusEvent) => void) => window.api.inference.onStatusEvent(cb),
}
