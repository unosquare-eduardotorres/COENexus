import { Routes, Route } from 'react-router-dom'
import BugLayout from './components/BugLayout'
import ErrorDashboard from './pages/ErrorDashboard'

export default function BugApp() {
  return (
    <Routes>
      <Route element={<BugLayout />}>
        <Route index element={<ErrorDashboard />} />
      </Route>
    </Routes>
  )
}
