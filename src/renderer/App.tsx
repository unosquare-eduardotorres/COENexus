import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './contexts/ThemeContext';
import { NexusStatusProvider } from './contexts/NexusStatusContext';
import NexusLanding from './hub/NexusLanding';
import ResumeApp from './apps/resume/ResumeApp';
import ErrorBoundary from './components/ErrorBoundary';
import NexusStatusBar from './components/NexusStatusBar';
import ClaudeStatusModal from './components/modals/ClaudeStatusModal';
import TokenUsageModal from './components/modals/TokenUsageModal';
import SharePointTokenModal from './components/modals/SharePointTokenModal';

const DataSyncApp = lazy(() => import('./apps/datasync/DataSyncApp'));
const CommandCenterApp = lazy(() => import('./apps/command-center/CommandCenterApp'));
const AgentsApp = lazy(() => import('./apps/agents/AgentsApp'));
const PathApp = lazy(() => import('./apps/path/PathApp'));
const SettingsApp = lazy(() => import('./apps/settings/SettingsApp'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ErrorBoundary>
          <HashRouter>
            <NexusStatusProvider>
              <Routes>
                <Route path="/" element={<NexusLanding />} />
                <Route path="/resume/*" element={<ResumeApp />} />
                <Route path="/datasync/*" element={<Suspense fallback={null}><DataSyncApp /></Suspense>} />
                <Route path="/command-center/*" element={<Suspense fallback={null}><CommandCenterApp /></Suspense>} />
                <Route path="/agents/*" element={<Suspense fallback={null}><AgentsApp /></Suspense>} />
                <Route path="/path/*" element={<Suspense fallback={null}><PathApp /></Suspense>} />
                <Route path="/settings/*" element={<Suspense fallback={null}><SettingsApp /></Suspense>} />
              </Routes>
              <NexusStatusBar />
              <ClaudeStatusModal />
              <TokenUsageModal />
              <SharePointTokenModal />
            </NexusStatusProvider>
          </HashRouter>
        </ErrorBoundary>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
