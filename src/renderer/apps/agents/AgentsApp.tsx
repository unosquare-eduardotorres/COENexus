import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import AgentsLayout from './components/AgentsLayout'
import AgentsLandingPage from './pages/AgentsLandingPage'
import AgentDetailPage from './pages/AgentDetailPage'

const Scout9Page = lazy(() => import('./pages/Scout9Page'))
const VigilPage = lazy(() => import('./pages/VigilPage'))
const PipelineTab = lazy(() => import('./pages/scout9/PipelineTab'))
const ReportsTab = lazy(() => import('./pages/scout9/ReportsTab'))
const KnowledgeBaseTab = lazy(() => import('./pages/scout9/KnowledgeBaseTab'))
const SettingsTab = lazy(() => import('./pages/scout9/SettingsTab'))
const Scout9ChatTab = lazy(() => import('./pages/scout9/Scout9ChatTab'))
const StubAgentPage = lazy(() => import('./pages/StubAgentPage'))
const BraniacPage = lazy(() => import('./pages/BraniacPage'))

function RouteFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-muted">Loading...</span>
      </div>
    </div>
  )
}

export default function AgentsApp() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<AgentsLayout />}>
          <Route index element={<AgentsLandingPage />} />
          <Route path="scout-9" element={<Scout9Page />}>
            <Route index element={<PipelineTab />} />
            <Route path="reports" element={<ReportsTab />} />
            <Route path="brain" element={<KnowledgeBaseTab />} />
            <Route path="chat" element={<Scout9ChatTab />} />
            <Route path="settings" element={<SettingsTab />} />
          </Route>
          <Route path="vigil" element={<VigilPage />} />
          <Route path="braniac" element={<BraniacPage />} />
          <Route path="switchboard" element={<StubAgentPage />} />
          <Route path="sensei" element={<StubAgentPage />} />
          <Route path="payday" element={<StubAgentPage />} />
          <Route path=":agentId" element={<AgentDetailPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
