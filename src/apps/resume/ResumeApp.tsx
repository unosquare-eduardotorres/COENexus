import { Routes, Route, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import TransformPage from './pages/TransformPage';
import RecruiterDashboard from './pages/RecruiterDashboard';
import AdminDashboard from './pages/AdminDashboard';
import MatchEnginePage from './pages/MatchEnginePage';
import BatchPage from './pages/BatchPage';
import DataSyncPage from './pages/DataSyncPage';

function SettingsWrapper() {
  const navigate = useNavigate();
  return <AdminDashboard onNavigateToResume={(id) => navigate(`/resume/review?resume=${id}`)} />;
}

export default function ResumeApp() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/enhance" element={<TransformPage />} />
        <Route path="/match" element={<MatchEnginePage />} />
        <Route path="/batch" element={<BatchPage />} />
        <Route path="/data-sync" element={<DataSyncPage />} />
        <Route path="/review" element={<RecruiterDashboard />} />
        <Route path="/settings" element={<SettingsWrapper />} />
      </Routes>
    </Layout>
  );
}
