import { registerVemHandlers } from './vem'
import { registerDataSyncHandlers } from './datasync'
import { registerReportHandlers } from './report'
import { registerPrrHandlers } from './prr'
import { registerAppHandlers } from './app.ipc'
import { registerPathHandlers } from './path.ipc'
import { registerScout9Handlers } from './scout9.ipc'
import { registerVigilHandlers } from './vigil.ipc'
import { registerBugHandlers } from './bug.ipc'
import { registerAgentStubHandlers } from './agentStub.ipc'
import { registerNomicoreHandlers } from './nomicore.ipc'
import { registerMailHandlers } from './mail.ipc'
import { registerBraniacHandlers } from './braniac.ipc'

export function registerAllHandlers(): void {
  registerAppHandlers()
  registerVemHandlers()
  registerDataSyncHandlers()
  registerReportHandlers()
  registerPrrHandlers()
  registerPathHandlers()
  registerScout9Handlers()
  registerVigilHandlers()
  registerBugHandlers()
  registerAgentStubHandlers()
  registerNomicoreHandlers()
  registerMailHandlers()
  registerBraniacHandlers()
}
