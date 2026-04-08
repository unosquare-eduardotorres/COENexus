import { ipcMain } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import type { IpcContracts } from '../../shared/ipc-types'
import { wrapIpcHandler } from './errorHandler'

type IpcChannel = keyof IpcContracts

type IpcRequestArgs<C extends IpcChannel> =
  IpcContracts[C]['request'] extends void
    ? []
    : IpcContracts[C]['request'] extends readonly [...infer TupleArgs]
      ? TupleArgs
      : [IpcContracts[C]['request']]

export function registerIpcHandler<C extends IpcChannel, T>(
  channel: C,
  handler: (event: IpcMainInvokeEvent, ...args: IpcRequestArgs<C>) => Promise<T>,
): void {
  ipcMain.handle(
    channel,
    wrapIpcHandler<T, IpcRequestArgs<C>>(channel, handler),
  )
}
