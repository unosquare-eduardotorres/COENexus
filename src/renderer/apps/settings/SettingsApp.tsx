import { Routes, Route } from 'react-router-dom'
import SettingsLayout from './components/SettingsLayout'
import DatabaseSettingsPage from './pages/DatabaseSettingsPage'
import EmailSettingsPage from './pages/EmailSettingsPage'

export default function SettingsApp() {
  return (
    <Routes>
      <Route element={<SettingsLayout />}>
        <Route index element={<DatabaseSettingsPage />} />
        <Route path="email" element={<EmailSettingsPage />} />
      </Route>
    </Routes>
  )
}
