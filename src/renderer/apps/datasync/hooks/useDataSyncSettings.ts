import { useState, useCallback } from 'react';
import { useIpcQuery, useInvalidateQueries } from '../../../shared/hooks/useIpcQuery';
import { VectorizationConfig } from '../types';
import { vectorizationConfigService } from '../services/vectorizationConfigService';

export function useDataSyncSettings() {
  const [vecConfig, setVecConfig] = useState<VectorizationConfig>(vectorizationConfigService.getConfig());

  const { data: voyageKeyStatus } = useIpcQuery(
    ['datasync', 'voyage-key-status'],
    () => vectorizationConfigService.checkVoyageKey()
  );

  const invalidate = useInvalidateQueries();

  const voyageKeyConfigured = voyageKeyStatus?.configured ?? false;
  const voyageMaskedKeys = voyageKeyStatus?.maskedKeys ?? [];
  const voyageKeySource = voyageKeyStatus?.source ?? '';

  const handleSaveVecModel = useCallback(() => {
    vectorizationConfigService.saveModel(vecConfig.model);
  }, [vecConfig.model]);

  const handleAddVoyageKey = useCallback(async (apiKey: string) => {
    await vectorizationConfigService.addVoyageKey(apiKey);
    invalidate(['datasync', 'voyage-key-status']);
  }, [invalidate]);

  const handleRemoveVoyageKey = useCallback(async (index: number) => {
    await vectorizationConfigService.removeVoyageKey(index);
    invalidate(['datasync', 'voyage-key-status']);
  }, [invalidate]);

  return {
    vecConfig,
    setVecConfig,
    handleSaveVecModel,
    voyageKeyConfigured,
    voyageMaskedKeys,
    voyageKeySource,
    handleAddVoyageKey,
    handleRemoveVoyageKey,
  };
}
