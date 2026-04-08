import { registerSyncHandlers } from './sync.ipc'
import { registerProcessingHandlers } from './processing.ipc'
import { registerMatchHandlers } from './match.ipc'
import { registerSessionsHandlers } from './sessions.ipc'
import { registerDatabaseHandlers } from './database.ipc'
import { registerAppHandlers } from './app.ipc'
import { registerAiHandlers } from './ai.ipc'

export function registerAllHandlers(): void {
  registerSyncHandlers()
  registerProcessingHandlers()
  registerMatchHandlers()
  registerSessionsHandlers()
  registerDatabaseHandlers()
  registerAppHandlers()
  registerAiHandlers()
}
