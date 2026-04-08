import { useState, useEffect, useCallback } from 'react';
import { SyncSourceType } from '../types';
import TokenInput from '../components/datasync/TokenInput';
import TokenTimer from '../components/datasync/TokenTimer';
import TokenExpirationWarning from '../components/datasync/TokenExpirationWarning';
import SyncDashboard from '../components/datasync/SyncDashboard';
import { isTokenExpired } from '../utils/tokenUtils';
import { useDataSync } from '../hooks/useDataSync';
import { databaseSharingService } from '../services/databaseSharingService';

export default function DataSyncPage() {
  const [isDatabaseEmpty, setIsDatabaseEmpty] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<Record<string, number> | null>(null);
  const [dismissedBanner, setDismissedBanner] = useState(false);

  const checkDatabaseEmpty = useCallback(async () => {
    try {
      const status = await databaseSharingService.getStatus();
      const syncTables = ['synced_employees', 'synced_candidates', 'synced_open_positions'];
      const allEmpty = syncTables.every(t => (status.recordCounts[t] ?? 0) === 0);
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

  const {
    token: { token, setToken, isTokenValid, hasEntered, setHasEntered, isValidating, tokenError, handleValidate, handleDisconnect, handleContinueWithoutToken, handleRefreshToken, handleTokenExpired },
    tab: { activeTab, setActiveTab },
    sync: { isSyncing, handleStartSync, handlePauseSync, handleResumeSync, handleResync },
    records: { activeRecords, activeProgress, isLoadingRecords },
    processing: { activeExtractionProgress, activeVectorizationProgress },
    extraction: { handleStartExtraction, handlePauseExtraction, extractingUpstreamId },
    vectorization: { handleStartVectorization, handlePauseVectorization, vectorizingUpstreamId },
    singleRecord: { refreshingId, vectorizingId, handleRefreshRecord, handleVectorizeRecord },
    retry: { handleRetryFailed, handleRetryFailedVectorization, handleRetryIncomplete, handleRetryNotProcessed },
    year: { selectedYear, handleYearChange },
    clear: { isClearing, handleClearData },
    expiration: { showExpirationWarning, minutesRemaining },
  } = useDataSync();

  const handleDismissWarning = () => {};

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel-subtle text-xs font-medium text-muted mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse" />
            Data Sync
          </div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">Data Sync</h1>
          <p className="text-base text-secondary mt-3 max-w-xl mx-auto">
            Import employee, candidate & open position data from source systems
          </p>
        </div>

        {isDatabaseEmpty && !dismissedBanner && !importSuccess && (
          <div className="mb-8 glass-panel border-amber-400/30 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-900/10">
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

        {!hasEntered ? (
          <div className="max-w-lg mx-auto">
            <TokenInput
              token={token}
              onTokenChange={setToken}
              isValid={isTokenValid}
              onValidate={handleValidate}
              isValidating={isValidating}
              error={tokenError}
              onDisconnect={handleDisconnect}
              onContinueWithoutToken={handleContinueWithoutToken}
            />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="inline-flex bg-white/50 dark:bg-dark-surface/50 rounded-xl p-1 border border-gray-200/50 dark:border-dark-border/50">
                {(['employees', 'candidates', 'open-positions'] as SyncSourceType[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      activeTab === tab
                        ? 'bg-white dark:bg-dark-hover shadow-sm text-primary'
                        : 'text-muted hover:text-secondary'
                    }`}
                  >
                    {tab === 'employees' ? 'Employees' : tab === 'candidates' ? 'Candidates' : 'Open Positions'}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                {isTokenValid ? (
                  <>
                    <TokenTimer token={token} onExpired={handleTokenExpired} />
                    <button
                      onClick={handleDisconnect}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 hover:text-red-600 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 rounded-lg transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                      </svg>
                      Disconnect
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setHasEntered(false)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-accent-500 hover:bg-accent-600 rounded-lg transition-colors shadow-sm shadow-accent-500/25 animate-pulse hover:animate-none"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.9-4.243a4.5 4.5 0 00-1.242-7.244l4.5-4.5a4.5 4.5 0 016.364 6.364l-1.757 1.757" />
                    </svg>
                    Connect Token
                  </button>
                )}
              </div>
            </div>

            <SyncDashboard
              source={activeTab}
              progress={activeProgress}
              records={activeRecords}
              onStartSync={isTokenValid ? handleStartSync : undefined}
              onResync={isTokenValid ? handleResync : undefined}
              onPauseSync={handlePauseSync}
              onResumeSync={isTokenValid ? handleResumeSync : undefined}
              onRetryIncomplete={isTokenValid ? handleRetryIncomplete : undefined}
              onRetryNotProcessed={isTokenValid ? handleRetryNotProcessed : undefined}
              onStartExtraction={isTokenValid ? handleStartExtraction : undefined}
              onPauseExtraction={handlePauseExtraction}
              onResumeExtraction={isTokenValid ? handleStartExtraction : undefined}
              extractionProgress={activeExtractionProgress}
              extractingUpstreamId={extractingUpstreamId}
              onStartVectorization={handleStartVectorization}
              onPauseVectorization={handlePauseVectorization}
              onResumeVectorization={handleStartVectorization}
              vectorizationProgress={activeVectorizationProgress}
              vectorizingUpstreamId={vectorizingUpstreamId}
              onRetryFailed={handleRetryFailed}
              onRetryFailedVectorization={handleRetryFailedVectorization}
              onRefreshRecord={isTokenValid ? handleRefreshRecord : undefined}
              onVectorizeRecord={handleVectorizeRecord}
              refreshingId={refreshingId}
              vectorizingId={vectorizingId}
              onClearData={handleClearData}
              isLoadingRecords={isLoadingRecords}
              isClearing={isClearing}
              selectedYear={selectedYear}
              onYearChange={handleYearChange}
            />
          </div>
        )}
      </div>

      {showExpirationWarning && (
        <TokenExpirationWarning
          minutesRemaining={minutesRemaining}
          isExpired={isTokenExpired(token)}
          onRefreshToken={handleRefreshToken}
          onDismiss={handleDismissWarning}
          isSyncing={isSyncing}
        />
      )}
    </div>
  );
}
