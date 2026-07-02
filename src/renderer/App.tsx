import React, { lazy, Suspense, useEffect } from 'react';
import { HashRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './contexts/ThemeContext';
import { NexusStatusProvider } from './contexts/NexusStatusContext';
import { SyncActivityProvider } from './contexts/SyncActivityContext';
import { ToastProvider } from './shared/components/ToastContext';
import NexusLanding from './hub/NexusLanding';
import ResumeApp from './apps/resume/ResumeApp';
import ErrorBoundary from './components/ErrorBoundary';
import { useErrorCapture } from './hooks/useErrorCapture';
import { useErrorToastListener } from './hooks/useErrorToastListener';
import NexusStatusBar from './components/NexusStatusBar';
import ClaudeStatusModal from './components/modals/ClaudeStatusModal';
import TokenUsageModal from './components/modals/TokenUsageModal';
import ApiTokenModal from './components/modals/ApiTokenModal';

const DataSyncApp = lazy(() => import('./apps/datasync/DataSyncApp'));
const CommandCenterApp = lazy(() => import('./apps/command-center/CommandCenterApp'));
const SettingsApp = lazy(() => import('./apps/settings/SettingsApp'));
const BugApp = lazy(() => import('./apps/bug/BugApp'));
const NomicoreApp = lazy(() => import('./apps/nomicore/NomicoreApp'));
const CatalogsApp = lazy(() => import('./apps/catalogs/CatalogsApp'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ErrorCaptureProvider({ children }: { children: React.ReactNode }) {
  useErrorCapture();
  useErrorToastListener();
  return <>{children}</>;
}

function AppNavigationBridge() {
  const navigate = useNavigate();
  useEffect(() => {
    const unsub = window.api?.app?.onNavigate?.((data: { path: string }) => {
      navigate(data.path);
    });
    return () => unsub?.();
  }, [navigate]);
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ErrorBoundary>
          <ToastProvider>
            <ErrorCaptureProvider>
              <HashRouter>
                <NexusStatusProvider>
                  <SyncActivityProvider>
                    <AppNavigationBridge />
                    <Routes>
                      <Route path="/" element={<NexusLanding />} />
                      <Route path="/resume/*" element={<ResumeApp />} />
                      <Route path="/datasync/*" element={<Suspense fallback={null}><DataSyncApp /></Suspense>} />
                      <Route path="/command-center/*" element={<Suspense fallback={null}><CommandCenterApp /></Suspense>} />
                      <Route path="/settings/*" element={<Suspense fallback={null}><SettingsApp /></Suspense>} />
                      <Route path="/bug/*" element={<Suspense fallback={null}><BugApp /></Suspense>} />
                      <Route path="/nomicore/*" element={<Suspense fallback={null}><NomicoreApp /></Suspense>} />
                      <Route path="/catalogs/*" element={<Suspense fallback={null}><CatalogsApp /></Suspense>} />
                    </Routes>
                    <NexusStatusBar />
                    <ClaudeStatusModal />
                    <TokenUsageModal />
                    <ApiTokenModal />
                  </SyncActivityProvider>
                </NexusStatusProvider>
              </HashRouter>
            </ErrorCaptureProvider>
          </ToastProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
