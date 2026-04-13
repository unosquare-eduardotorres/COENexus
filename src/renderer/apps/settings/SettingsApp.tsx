import { Routes, Route } from 'react-router-dom'
import SettingsLayout from './components/SettingsLayout'
import DatabaseSettingsPage from './pages/DatabaseSettingsPage'

export default function SettingsApp() {
  return (
    <Routes>
      <Route element={<SettingsLayout />}>
        <Route index element={<DatabaseSettingsPage />} />
      </Route>
    </Routes>
  )
}
