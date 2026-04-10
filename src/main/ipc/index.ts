import { registerVemHandlers } from './vem'
import { registerDataSyncHandlers } from './datasync'
import { registerAppHandlers } from './app.ipc'

export function registerAllHandlers(): void {
  registerAppHandlers()
  registerVemHandlers()
  registerDataSyncHandlers()
}
