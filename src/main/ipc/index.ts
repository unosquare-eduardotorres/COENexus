import { registerVemHandlers } from './vem'
import { registerDataSyncHandlers } from './datasync'
import { registerReportHandlers } from './report'
import { registerPrrHandlers } from './prr'
import { registerAppHandlers } from './app.ipc'
import { registerBugHandlers } from './bug.ipc'
import { registerNomicoreHandlers } from './nomicore.ipc'
import { registerMailHandlers } from './mail.ipc'
import { registerCoeTrackingHandlers } from './coeTracking'
import { registerResponsivenessHandlers } from './responsiveness'
import { registerCatalogHandlers } from './catalog'
import { registerPracticeLeadBonusHandlers } from './practiceLeadBonus'

export function registerAllHandlers(): void {
  registerAppHandlers()
  registerVemHandlers()
  registerDataSyncHandlers()
  registerReportHandlers()
  registerPrrHandlers()
  registerBugHandlers()
  registerNomicoreHandlers()
  registerMailHandlers()
  registerCoeTrackingHandlers()
  registerResponsivenessHandlers()
  registerCatalogHandlers()
  registerPracticeLeadBonusHandlers()
}
