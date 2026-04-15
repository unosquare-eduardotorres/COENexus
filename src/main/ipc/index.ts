import { registerVemHandlers } from './vem'
import { registerDataSyncHandlers } from './datasync'
import { registerReportHandlers } from './report'
import { registerPrrHandlers } from './prr'
import { registerAppHandlers } from './app.ipc'
import { registerPathHandlers } from './path.ipc'
import { registerScout9Handlers } from './scout9.ipc'
import { registerVigilHandlers } from './vigil.ipc'

export function registerAllHandlers(): void {
  registerAppHandlers()
  registerVemHandlers()
  registerDataSyncHandlers()
  registerReportHandlers()
  registerPrrHandlers()
  registerPathHandlers()
  registerScout9Handlers()
  registerVigilHandlers()
}
