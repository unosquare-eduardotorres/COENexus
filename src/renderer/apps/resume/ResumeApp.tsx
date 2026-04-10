import { lazy, Suspense } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import { ToastProvider } from '../../shared/components/ToastContext';

const HomePage = lazy(() => import('./pages/HomePage'));
const TransformPage = lazy(() => import('./pages/TransformPage'));
const RecruiterDashboard = lazy(() => import('./pages/RecruiterDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const MatchEnginePage = lazy(() => import('./pages/MatchEnginePage'));
const BatchPage = lazy(() => import('./pages/BatchPage'));
const TransformHistoryPage = lazy(() => import('./pages/TransformHistoryPage'));

function RouteFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-muted">Loading…</span>
      </div>
    </div>
  );
}

function SettingsWrapper() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<RouteFallback />}>
      <AdminDashboard onNavigateToResume={(id) => navigate(`/resume/review?resume=${id}`)} />
    </Suspense>
  );
}

export default function ResumeApp() {
  return (
    <ToastProvider>
      <Layout>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/enhance" element={<TransformPage />} />
            <Route path="/history" element={<TransformHistoryPage />} />
            <Route path="/match" element={<MatchEnginePage />} />
            <Route path="/batch" element={<BatchPage />} />
            <Route path="/review" element={<RecruiterDashboard />} />
            <Route path="/settings" element={<SettingsWrapper />} />
          </Routes>
        </Suspense>
      </Layout>
    </ToastProvider>
  );
}
