import type { IpcMainInvokeEvent } from 'electron'
import { createLogger } from '../services/logger'

const log = createLogger('IPC')

export type IpcHandlerError = {
  __ipcError: true
  message: string
  channel: string
}

export function wrapIpcHandler<T, Args extends unknown[]>(
  channel: string,
  handler: (event: IpcMainInvokeEvent, ...args: Args) => Promise<T>,
): (event: IpcMainInvokeEvent, ...args: Args) => Promise<T | IpcHandlerError> {
  return async (event: IpcMainInvokeEvent, ...args: Args): Promise<T | IpcHandlerError> => {
    try {
      return await handler(event, ...args)
    } catch (err) {
      log.error(`Handler failed: ${channel}`, err instanceof Error ? err : undefined, { channel })
      return {
        __ipcError: true,
        message: err instanceof Error ? err.message : 'Unknown IPC error',
        channel,
      }
    }
  }
}
