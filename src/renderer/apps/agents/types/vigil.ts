import type {
  VigilConfig as SharedVigilConfig,
  VigilActivityLog as SharedVigilActivityLog,
  VigilActivityEventType as SharedVigilActivityEventType,
  VigilRun as SharedVigilRun,
  VigilRunStatus,
  VigilChatMessage as SharedVigilChatMessage,
  VigilSource,
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

export type VigilConfig = SharedVigilConfig
export type VigilActivityEntry = SharedVigilActivityLog
export type VigilEventType = SharedVigilActivityEventType
export type VigilRun = SharedVigilRun
export type VigilChatMessage = SharedVigilChatMessage

export type VigilState = 'sleeping' | 'awake' | 'syncing' | 'error'

export type HeartbeatSourceStatus = 'success' | 'failed' | 'running' | 'skipped' | 'missed'
export type HeartbeatDayStatus = 'success' | 'partial' | 'failed' | 'missed'

export interface HeartbeatDay {
  date: string
  status: HeartbeatDayStatus
  sources: Partial<Record<VigilSource, HeartbeatSourceStatus>>
  runId?: string | null
}

export type ProposedActionType =
  | 'run_all'
  | 'run_source'
  | 'pause_run'
  | 'update_schedule'
  | 'clear_activity'
  | 'clear_chat'
  | 'custom'

export interface ProposedAction {
  id: string
  type: ProposedActionType
  label: string
  description?: string
  payload?: Record<string, unknown>
  requiresConfirmation?: boolean
}

export type {
  VigilSource,
  VigilRunStatus,
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
}
