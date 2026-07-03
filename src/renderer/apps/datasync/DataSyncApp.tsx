import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

const DataSyncPage = lazy(() => import('./pages/DataSyncPage'));

function RouteFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-muted">Loading…</span>
      </div>
    </div>
  );
}

export default function DataSyncApp() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<DataSyncPage />} />
      </Routes>
    </Suspense>
  );
}
