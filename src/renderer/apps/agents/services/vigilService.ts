import type {
  VigilRunParams,
  VigilCancelRunParams,
  VigilListRunsParams,
  VigilGetActivityLogParams,
  VigilUpdateConfigParams,
  VigilSendChatMessageParams,
  VigilListChatMessagesParams,
  VigilToolsDryRunParams,
  VigilSyncSourceParams,
  VigilActivityEvent,
  VigilStatusEvent,
} from '../../../../shared/ipc-types'

export const vigilService = {
  run: (params: VigilRunParams) => window.api.vigil.run(params),
  cancelRun: (params: VigilCancelRunParams) => window.api.vigil.cancelRun(params),
  getStatus: () => window.api.vigil.getStatus(),
  listRuns: (params?: VigilListRunsParams) => window.api.vigil.listRuns(params),
  getRun: (runId: string) => window.api.vigil.getRun(runId),
  getActivityLog: (params?: VigilGetActivityLogParams) => window.api.vigil.getActivityLog(params),
  clearActivityLog: () => window.api.vigil.clearActivityLog(),
  getConfig: () => window.api.vigil.getConfig(),
  updateConfig: (params: VigilUpdateConfigParams) => window.api.vigil.updateConfig(params),
  sendMessage: (params: VigilSendChatMessageParams) => window.api.vigil.sendMessage(params),
  listMessages: (params?: VigilListChatMessagesParams) => window.api.vigil.listMessages(params),
  clearMessages: () => window.api.vigil.clearMessages(),
  toolsDryRun: (params: VigilToolsDryRunParams) => window.api.vigil.toolsDryRun(params),
  syncSource: (params: VigilSyncSourceParams) => window.api.vigil.syncSource(params),
  onActivityEvent: (callback: (event: VigilActivityEvent) => void) =>
    window.api.vigil.onActivityEvent(callback),
  onStatusEvent: (callback: (event: VigilStatusEvent) => void) =>
    window.api.vigil.onStatusEvent(callback),
}
