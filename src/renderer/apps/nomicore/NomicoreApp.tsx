import { Routes, Route } from 'react-router-dom'
import NomicoreLayout from './components/NomicoreLayout'
import NomicorePage from './pages/NomicorePage'

export default function NomicoreApp() {
  return (
    <Routes>
      <Route element={<NomicoreLayout />}>
        <Route index element={<NomicorePage />} />
      </Route>
    </Routes>
  )
}
