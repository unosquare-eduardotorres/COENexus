import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './contexts/ThemeContext';
import NexusLanding from './hub/NexusLanding';
import ResumeApp from './apps/resume/ResumeApp';
import ErrorBoundary from './components/ErrorBoundary';

const DataSyncApp = lazy(() => import('./apps/datasync/DataSyncApp'));

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
            <Routes>
              <Route path="/" element={<NexusLanding />} />
              <Route path="/resume/*" element={<ResumeApp />} />
              <Route path="/datasync/*" element={<Suspense fallback={null}><DataSyncApp /></Suspense>} />
            </Routes>
          </HashRouter>
        </ErrorBoundary>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
