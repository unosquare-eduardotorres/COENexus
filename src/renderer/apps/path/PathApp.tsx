import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import PathLayout from './components/PathLayout';
import { PathRoleProvider } from './contexts/PathRoleContext';

const DeveloperDashboardPage = lazy(() => import('./pages/DeveloperDashboardPage'));
const DpPortalPage = lazy(() => import('./pages/DpPortalPage'));
const LearningPathsPage = lazy(() => import('./pages/LearningPathsPage'));
const InsightsPage = lazy(() => import('./pages/InsightsPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const AssessmentQueuePage = lazy(() => import('./pages/AssessmentQueuePage'));
const CareerLaddersPage = lazy(() => import('./pages/CareerLaddersPage'));
const SkillTaxonomyPage = lazy(() => import('./pages/SkillTaxonomyPage'));

function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
        <span className="text-sm text-muted">Loading…</span>
      </div>
    </div>
  );
}

export default function PathApp() {
  return (
    <PathRoleProvider>
      <PathLayout>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<DeveloperDashboardPage />} />
            <Route path="/dp-portal" element={<DpPortalPage />} />
            <Route path="/learning-paths" element={<LearningPathsPage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/assessment-queue" element={<AssessmentQueuePage />} />
            <Route path="/career-ladders" element={<CareerLaddersPage />} />
            <Route path="/skill-taxonomy" element={<SkillTaxonomyPage />} />
          </Routes>
        </Suspense>
      </PathLayout>
    </PathRoleProvider>
  );
}
