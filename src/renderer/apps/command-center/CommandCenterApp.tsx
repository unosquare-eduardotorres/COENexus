import { lazy, Suspense, useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import CommandCenterLayout from './components/CommandCenterLayout'
import { reportService } from './services/reportService'

const CommandCenterHome = lazy(() => import('./pages/CommandCenterHome'))
const OpenPositionsReport = lazy(() => import('./pages/OpenPositionsReport'))
const PrrReport = lazy(() => import('./pages/PrrReport'))
const UnderConstruction = lazy(() => import('./pages/UnderConstruction'))

function RouteFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-muted">Loading...</span>
      </div>
    </div>
  )
}

export default function CommandCenterApp() {
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)

  useEffect(() => {
    reportService.getSyncStatus().then(s => setLastSyncedAt(s.lastSyncedAt)).catch(() => {})
  }, [])

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<CommandCenterLayout lastSyncedAt={lastSyncedAt} />}>
          <Route index element={<CommandCenterHome />} />
          <Route path="open-positions" element={<OpenPositionsReport />} />
          <Route path="placements" element={<UnderConstruction title="Placements" />} />
          <Route path="reallocation" element={<PrrReport />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
