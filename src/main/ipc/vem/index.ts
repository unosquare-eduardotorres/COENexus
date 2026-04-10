import { registerProcessingHandlers } from './processing.ipc'
import { registerMatchHandlers } from './match.ipc'
import { registerSessionsHandlers } from './sessions.ipc'
import { registerDatabaseHandlers } from './database.ipc'
import { registerAiHandlers } from './ai.ipc'

export function registerVemHandlers(): void {
  registerProcessingHandlers()
  registerMatchHandlers()
  registerSessionsHandlers()
  registerDatabaseHandlers()
  registerAiHandlers()
}
