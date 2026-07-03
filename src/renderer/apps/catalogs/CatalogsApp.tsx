import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import CatalogsLayout from './components/CatalogsLayout'

const CatalogsHome = lazy(() => import('./pages/CatalogsHome'))
const CoesPage = lazy(() => import('./pages/CoesPage'))
const PracticesPage = lazy(() => import('./pages/PracticesPage'))
const SkillsPage = lazy(() => import('./pages/SkillsPage'))

function RouteFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
    </div>
  )
}

export default function CatalogsApp() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<CatalogsLayout />}>
          <Route index element={<CatalogsHome />} />
          <Route path="coes" element={<CoesPage />} />
          <Route path="practices" element={<PracticesPage />} />
          <Route path="skills" element={<SkillsPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
