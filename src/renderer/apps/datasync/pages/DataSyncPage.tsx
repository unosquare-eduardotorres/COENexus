import { useState, useEffect, useCallback } from 'react';
import { DataSyncPanel } from '../components/DataSyncLayout';
import DataSyncLayout from '../components/DataSyncLayout';
import DataSyncOverview from '../components/DataSyncOverview';
import SyncDashboard from '../components/SyncDashboard';
import VectorizationPanel from '../components/VectorizationPanel';
import { useDataSync } from '../hooks/useDataSync';
import { useDataSyncSettings } from '../hooks/useDataSyncSettings';
import { useNexusStatus } from '../../../contexts/NexusStatusContext';
import { databaseSharingService } from '../services/databaseSharingService';

export default function DataSyncPage() {
  const [activePanel, setActivePanel] = useState<DataSyncPanel>('overview');
  const [isDatabaseEmpty, setIsDatabaseEmpty] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<Record<string, number> | null>(null);
  const [dismissedBanner, setDismissedBanner] = useState(false);

  const checkDatabaseEmpty = useCallback(async () => {
    try {
      const status = await databaseSharingService.getStatus();
      if ((status as any).__ipcError || !status.recordCounts) {
        setIsDatabaseEmpty(false);
        return;
      }
      const syncTables = ['synced_employees', 'synced_candidates', 'synced_open_positions'];
      const allEmpty = syncTables.every(t => (status.recordCounts?.[t] ?? 0) === 0);
      setIsDatabaseEmpty(allEmpty);
    } catch {
      setIsDatabaseEmpty(false);
    }
  }, []);

  useEffect(() => {
    checkDatabaseEmpty();
  }, [checkDatabaseEmpty]);

  const handleImportDatabase = async () => {
    setIsImporting(true);
    setImportError(null);
    setImportSuccess(null);
    try {
      const result = await databaseSharingService.importFile();
      if (result.cancelled) {
        setIsImporting(false);
        return;
      }
      if (result.success && result.recordCounts) {
        setImportSuccess(result.recordCounts);
        setIsDatabaseEmpty(false);
        window.location.reload();
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const { sharepoint } = useNexusStatus();
  const isTokenValid = sharepoint.isValid;

  const {
    sync: { isSyncing, handleStartSync, handlePauseSync, handleResumeSync },
    records: { activeRecords, activeProgress, isLoadingRecords },
    processing: { activeExtractionProgress, activeVectorizationProgress },
    extraction: { handleStartExtraction, handlePauseExtraction, extractingUpstreamId },
    vectorization: { handleStartVectorization, handlePauseVectorization, vectorizingUpstreamId },
    processAll: { handleProcessAll },
    singleRecord: { refreshingId, vectorizingId, handleRefreshRecord, handleVectorizeRecord },
    year: { selectedYear, handleYearChange },
    clear: { isClearing, handleClearData },
  } = useDataSync(activePanel);

  const settings = useDataSyncSettings();

  const renderContent = () => {
    if (activePanel === 'overview') {
      return <DataSyncOverview onNavigate={setActivePanel} />;
    }

    if (activePanel === 'vectorization') {
      return (
        <VectorizationPanel
          vecConfig={settings.vecConfig}
          setVecConfig={settings.setVecConfig}
          handleSaveVecModel={settings.handleSaveVecModel}
          voyageKeyConfigured={settings.voyageKeyConfigured}
          voyageMaskedKeys={settings.voyageMaskedKeys}
          voyageKeySource={settings.voyageKeySource}
          onAddVoyageKey={settings.handleAddVoyageKey}
          onRemoveVoyageKey={settings.handleRemoveVoyageKey}
        />
      );
    }

    return (
      <>
        {isDatabaseEmpty && !dismissedBanner && !importSuccess && (
          <div className="mb-6 glass-panel border-amber-400/30 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-900/10">
            <div className="flex items-start gap-4 p-5">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">Database is empty</h3>
                <p className="text-sm text-amber-700/80 dark:text-amber-400/70 mt-1">
                  No synced data found. If you have an existing <code className="px-1.5 py-0.5 rounded bg-amber-200/50 dark:bg-amber-500/20 text-xs font-mono">nexus.db</code> file
                  from a previous installation or a shared export, you can import it to restore your data.
                </p>
                {importError && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-2">{importError}</p>
                )}
                <div className="flex items-center gap-3 mt-4">
                  <button
                    onClick={handleImportDatabase}
                    disabled={isImporting}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isImporting ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Importing...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                        Import Database File
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setDismissedBanner(true)}
                    className="text-sm text-amber-600/70 dark:text-amber-400/60 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
                  >
                    Dismiss
                  </button>
                  <span className="text-xs text-amber-600/50 dark:text-amber-400/40">
                    or sync fresh data below
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <SyncDashboard
          source={activePanel as 'employees' | 'candidates' | 'open-positions'}
          progress={activeProgress}
          records={activeRecords}
          onStartSync={handleStartSync}
          onPauseSync={handlePauseSync}
          onResumeSync={handleResumeSync}
          onStartExtraction={handleStartExtraction}
          onPauseExtraction={handlePauseExtraction}
          onResumeExtraction={handleStartExtraction}
          extractionProgress={activeExtractionProgress}
          extractingUpstreamId={extractingUpstreamId}
          onStartVectorization={handleStartVectorization}
          onPauseVectorization={handlePauseVectorization}
          onResumeVectorization={handleStartVectorization}
          vectorizationProgress={activeVectorizationProgress}
          vectorizingUpstreamId={vectorizingUpstreamId}
          onRefreshRecord={handleRefreshRecord}
          onVectorizeRecord={handleVectorizeRecord}
          refreshingId={refreshingId}
          vectorizingId={vectorizingId}
          onProcessAll={handleProcessAll}
          onClearData={handleClearData}
          isLoadingRecords={isLoadingRecords}
          isClearing={isClearing}
          selectedYear={selectedYear}
          onYearChange={handleYearChange}
          isSyncDisabled={!isTokenValid}
          isVoyageKeyConfigured={settings.voyageKeyConfigured}
        />
      </>
    );
  };

  return (
    <DataSyncLayout
      activePanel={activePanel}
      onPanelChange={setActivePanel}
    >
      {renderContent()}
    </DataSyncLayout>
  );
}
