import type {
  OracleChatMessage,
  OracleListChatMessagesParams,
  OracleResponse,
} from '../../../../shared/ipc-types'

export const oracleService = {
  sendMessage: (content: string, metadataJson?: string): Promise<OracleResponse<OracleChatMessage>> =>
    window.api.oracle.sendMessage({ content, metadata_json: metadataJson }),

  listMessages: (params?: OracleListChatMessagesParams): Promise<OracleResponse<OracleChatMessage[]>> =>
    window.api.oracle.listMessages(params),

  clearMessages: (): Promise<OracleResponse<{ cleared: boolean }>> =>
    window.api.oracle.clearMessages(),

  onStepEvent: (callback: (step: string) => void) =>
    window.api.oracle.onStepEvent((data) => callback(data.step)),

  onChunkEvent: (callback: (text: string) => void) =>
    window.api.oracle.onChunkEvent((data) => callback(data.text)),
}
