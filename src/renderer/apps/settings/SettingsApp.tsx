import { Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import SettingsLayout from './components/SettingsLayout'
import DatabaseSettingsPage from './pages/DatabaseSettingsPage'
import EmailSettingsPage from './pages/EmailSettingsPage'

const VectorizationSettingsPage = lazy(() => import('./pages/VectorizationSettingsPage'))
const DataMaintenanceSettingsPage = lazy(() => import('./pages/DataMaintenanceSettingsPage'))

export default function SettingsApp() {
  return (
    <Routes>
      <Route element={<SettingsLayout />}>
        <Route index element={<DatabaseSettingsPage />} />
        <Route path="email" element={<EmailSettingsPage />} />
        <Route path="vectorization" element={<Suspense fallback={null}><VectorizationSettingsPage /></Suspense>} />
        <Route path="data-maintenance" element={<Suspense fallback={null}><DataMaintenanceSettingsPage /></Suspense>} />
      </Route>
    </Routes>
  )
}
