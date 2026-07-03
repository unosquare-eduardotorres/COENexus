import { useState, useCallback } from 'react';
import { SyncSourceType } from '../types';
import { DataSyncPanel } from '../components/DataSyncLayout';
import { resumeProcessingService } from '../services/processingService';
import { useSyncPipeline } from './useSyncPipeline';
import { useIpcQuery } from '../../../shared/hooks/useIpcQuery';
import { SYNC_STATUS } from '../constants/syncStatus';
import { safeJsonParse as safeParseJSON } from '../../../shared/utils/safeJsonParse';
import { useNexusStatus } from '../../../contexts/NexusStatusContext';
import { createRendererLogger } from '../../../shared/utils/rendererLogger';

const log = createRendererLogger('useDataSync');

export function useDataSync(activePanel: DataSyncPanel) {
  const { apiTokens } = useNexusStatus();

  const [selectedYear, setSelectedYear] = useState<number | null>(() =>
    safeParseJSON(localStorage.getItem('datasync-candidate-year'), null)
  );

  const handleYearChange = useCallback((year: number) => {
    log.info('Data Sync candidate year selected', { year });
    setSelectedYear(year);
    localStorage.setItem('datasync-candidate-year', JSON.stringify(year));
  }, []);

  const employees = useSyncPipeline({
    source: 'employees',
    token: apiTokens.unocore.token,
    enabled: true,
  });
  const candidates = useSyncPipeline({
    source: 'candidates',
    token: apiTokens.unocore.token,
    enabled: true,
    selectedYear,
  });
  const openPositions = useSyncPipeline({
    source: 'open-positions',
    token: apiTokens.unocore.token,
    enabled: true,
  });
  const projectReallocations = useSyncPipeline({
    source: 'project-reallocations',
    token: apiTokens.unocore.token,
    enabled: true,
  });

  useIpcQuery(
    ['datasync-processing-status'],
    () => resumeProcessingService.getProcessingStatus(),
    { enabled: true, refetchInterval: 5000 },
  );

  const activeSource: SyncSourceType = activePanel === 'employees' ? 'employees'
    : activePanel === 'open-positions' ? 'open-positions'
    : activePanel === 'project-reallocations' ? 'project-reallocations'
    : 'candidates';
  const activePipeline = activeSource === 'employees' ? employees
    : activeSource === 'candidates' ? candidates
    : activeSource === 'project-reallocations' ? projectReallocations
    : openPositions;

  const isSyncing = employees.progress.status === SYNC_STATUS.SYNCING
    || candidates.progress.status === SYNC_STATUS.SYNCING
    || openPositions.progress.status === SYNC_STATUS.SYNCING
    || projectReallocations.progress.status === SYNC_STATUS.SYNCING;

  return {
    sync: {
      isSyncing,
      handleStartSync: activePipeline.handleStartSync,
      handleStartSyncAll: activePipeline.handleStartSyncAll,
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
    processAll: {
      handleProcessAll: activePipeline.handleProcessAll,
      isProcessingAll: activePipeline.isProcessingAll,
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
  };
}
