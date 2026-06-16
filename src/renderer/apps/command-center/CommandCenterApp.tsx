import { lazy, Suspense, useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import CommandCenterLayout from './components/CommandCenterLayout'
import { reportService } from './services/reportService'

const CommandCenterHome = lazy(() => import('./pages/CommandCenterHome'))
const OpenPositionsReport = lazy(() => import('./pages/OpenPositionsReport'))
const PrrReport = lazy(() => import('./pages/PrrReport'))
const UnderConstruction = lazy(() => import('./pages/UnderConstruction'))
const CoeTrackingPage = lazy(() => import('./pages/CoeTrackingPage'))
const CoePracticesPage = lazy(() => import('./pages/CoePracticesPage'))
const PracticeSkillsPage = lazy(() => import('./pages/PracticeSkillsPage'))
const CoePositionsPage = lazy(() => import('./pages/CoePositionsPage'))
const CoePositionDetailPage = lazy(() => import('./pages/CoePositionDetailPage'))
const CoeBonusPage = lazy(() => import('./pages/CoeBonusPage'))
const CoeBonusOverviewTab = lazy(() => import('./pages/coe-bonus/OverviewTab'))
const CoeBonusPlacementTab = lazy(() => import('./pages/coe-bonus/PlacementMarginTab'))
const CoeBonusGrossMarginTab = lazy(() => import('./pages/coe-bonus/GrossMarginTab'))
const CoeBonusFillRateTab = lazy(() => import('./pages/coe-bonus/FillRateTab'))
const CoeBonusAcceptanceTab = lazy(() => import('./pages/coe-bonus/AcceptanceRateTab'))
const ResponsivenessReport = lazy(() => import('./pages/ResponsivenessReport'))

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
          <Route path="coe-tracking" element={<CoeTrackingPage />} />
          <Route path="coe-tracking/:coe" element={<CoePracticesPage />} />
          <Route path="coe-tracking/:coe/:practice" element={<PracticeSkillsPage />} />
          <Route path="coe-tracking/:coe/:practice/:skill" element={<CoePositionsPage />} />
          <Route path="coe-tracking/:coe/:practice/:skill/:positionId" element={<CoePositionDetailPage />} />
          <Route path="responsiveness" element={<ResponsivenessReport />} />
          <Route path="coe-bonus" element={<CoeBonusPage />}>
            <Route index element={<CoeBonusOverviewTab />} />
            <Route path="placement-margin" element={<CoeBonusPlacementTab />} />
            <Route path="gross-margin" element={<CoeBonusGrossMarginTab />} />
            <Route path="fill-rate" element={<CoeBonusFillRateTab />} />
            <Route path="acceptance-rate" element={<CoeBonusAcceptanceTab />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  )
}
