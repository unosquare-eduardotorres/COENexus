import { useState, useCallback } from 'react'
import type { VectorizationConfig } from '../../resume/types'
import { vectorizationConfigService } from '../../resume/services/vectorizationConfigService'
import { useIpcQuery, useInvalidateQueries } from '../../../shared/hooks/useIpcQuery'
import VectorizationTab from '../../resume/components/settings/VectorizationTab'

export default function VectorizationSettingsPage() {
  const [vecConfig, setVecConfig] = useState<VectorizationConfig>(
    vectorizationConfigService.getConfig()
  )

  const { data: voyageKeyStatus } = useIpcQuery(
    ['settings', 'voyage-key-status'],
    () => vectorizationConfigService.checkVoyageKey()
  )

  const invalidateQueries = useInvalidateQueries()

  const handleSaveVecModel = useCallback(() => {
    vectorizationConfigService.saveModel(vecConfig.model)
  }, [vecConfig.model])

  const handleAddVoyageKey = useCallback(async (apiKey: string) => {
    await vectorizationConfigService.addVoyageKey(apiKey)
    invalidateQueries(['settings', 'voyage-key-status'])
  }, [invalidateQueries])

  const handleRemoveVoyageKey = useCallback(async (index: number) => {
    await vectorizationConfigService.removeVoyageKey(index)
    invalidateQueries(['settings', 'voyage-key-status'])
  }, [invalidateQueries])

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-lg font-semibold text-primary">Vectorization</h1>
        <p className="text-xs text-muted mt-0.5">
          Voyage AI API keys and embedding model configuration
        </p>
      </div>
      <VectorizationTab
        vecConfig={vecConfig}
        setVecConfig={setVecConfig}
        handleSaveVecModel={handleSaveVecModel}
        voyageKeyConfigured={voyageKeyStatus?.configured ?? false}
        voyageMaskedKeys={voyageKeyStatus?.maskedKeys ?? []}
        voyageKeySource={voyageKeyStatus?.source ?? ''}
        onAddVoyageKey={handleAddVoyageKey}
        onRemoveVoyageKey={handleRemoveVoyageKey}
      />
    </div>
  )
}
