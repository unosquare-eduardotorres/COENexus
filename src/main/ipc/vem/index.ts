import { registerProcessingHandlers } from './processing.ipc'
import { registerMatchHandlers } from './match.ipc'
import { registerSessionsHandlers } from './sessions.ipc'
import { registerDatabaseHandlers } from './database.ipc'
import { registerAiHandlers } from './ai.ipc'
import { registerPresentationHandlers } from './presentation.ipc'
import { registerPipelineHandlers } from './pipeline.ipc'
import { registerPositionPipelineHandlers } from './positionPipeline.ipc'
import { registerModelConfigHandlers } from './modelConfig.ipc'

export function registerVemHandlers(): void {
  registerProcessingHandlers()
  registerMatchHandlers()
  registerSessionsHandlers()
  registerDatabaseHandlers()
  registerAiHandlers()
  registerPresentationHandlers()
  registerPipelineHandlers()
  registerPositionPipelineHandlers()
  registerModelConfigHandlers()
}
