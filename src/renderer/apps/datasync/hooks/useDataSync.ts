import { useState, useCallback } from 'react';
import { SyncSourceType } from '../types';
import { DataSyncPanel } from '../components/DataSyncSidebar';
import { resumeProcessingService } from '../services/processingService';
import { useSyncAuth } from './useSyncAuth';
import { useSyncPipeline } from './useSyncPipeline';
import { useIpcQuery } from '../../../shared/hooks/useIpcQuery';
import { SYNC_STATUS } from '../constants/syncStatus';
import { safeJsonParse as safeParseJSON } from '../../../shared/utils/safeJsonParse';

export function useDataSync(activePanel: DataSyncPanel) {
  const auth = useSyncAuth();

  const [selectedYear, setSelectedYear] = useState<number | null>(() =>
    safeParseJSON(localStorage.getItem('datasync-candidate-year'), null)
  );

  const handleYearChange = useCallback((year: number) => {
    setSelectedYear(year);
    localStorage.setItem('datasync-candidate-year', JSON.stringify(year));
  }, []);

  const employees = useSyncPipeline({
    source: 'employees',
    token: auth.token,
    enabled: true,
  });
  const candidates = useSyncPipeline({
    source: 'candidates',
    token: auth.token,
    enabled: true,
    selectedYear,
  });
  const openPositions = useSyncPipeline({
    source: 'open-positions',
    token: auth.token,
    enabled: true,
  });

  useIpcQuery(
    ['datasync-processing-status'],
    () => resumeProcessingService.getProcessingStatus(),
    { enabled: true, refetchInterval: 5000 },
  );

  const activeSource: SyncSourceType = activePanel === 'employees' ? 'employees' : activePanel === 'open-positions' ? 'open-positions' : 'candidates';
  const activePipeline = activeSource === 'employees' ? employees : activeSource === 'candidates' ? candidates : openPositions;

  const isSyncing = employees.progress.status === SYNC_STATUS.SYNCING || candidates.progress.status === SYNC_STATUS.SYNCING || openPositions.progress.status === SYNC_STATUS.SYNCING;

  return {
    token: {
      token: auth.token,
      setToken: auth.setToken,
      isTokenValid: auth.isTokenValid,
      isValidating: auth.isValidating,
      tokenError: auth.tokenError,
      handleValidate: auth.handleValidate,
      handleDisconnect: auth.handleDisconnect,
      handleRefreshToken: auth.handleRefreshToken,
      handleTokenExpired: auth.handleTokenExpired,
    },
    sync: {
      isSyncing,
      handleStartSync: activePipeline.handleStartSync,
      handlePauseSync: activePipeline.handlePauseSync,
      handleResumeSync: activePipeline.handleResumeSync,
    },
    records: {
      activeRecords: activePipeline.records,
      activeProgress: activePipeline.progress,
      isLoadingRecords: activePipeline.isLoadingRecords,
    },
    processing: {
      activeExtractionProgress: activePipeline.extractionProgress,
      activeVectorizationProgress: activePipeline.vectorizationProgress,
    },
    extraction: {
      handleStartExtraction: activePipeline.handleStartExtraction,
      handlePauseExtraction: activePipeline.handlePauseExtraction,
      extractingUpstreamId: activePipeline.extractingUpstreamId,
    },
    vectorization: {
      handleStartVectorization: activePipeline.handleStartVectorization,
      handlePauseVectorization: activePipeline.handlePauseVectorization,
      vectorizingUpstreamId: activePipeline.vectorizingUpstreamId,
    },
    singleRecord: {
      refreshingId: activePipeline.refreshingId,
      vectorizingId: activePipeline.vectorizingId,
      handleRefreshRecord: activePipeline.handleRefreshRecord,
      handleVectorizeRecord: activePipeline.handleVectorizeRecord,
    },
    year: { selectedYear, handleYearChange },
    clear: {
      isClearing: activePipeline.isClearing,
      handleClearData: activePipeline.handleClearData,
    },
    expiration: {
      showExpirationWarning: auth.showExpirationWarning,
      setShowExpirationWarning: auth.setShowExpirationWarning,
      minutesRemaining: auth.minutesRemaining,
    },
  };
}
