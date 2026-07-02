import { useState, useEffect, useCallback } from 'react'
import type { ModelConfig, FeatureKey, PresetMode, LlmProvider, FeatureModelAssignment } from '../../../../shared/model-config-types'
import { FEATURE_REGISTRY, CLAUDE_MODELS, ALL_FEATURE_KEYS, buildDefaultFeatures } from '../../../../shared/model-config-types'

type HealthStatus = 'unknown' | 'checking' | 'available' | 'unavailable'

export default function AIModelsSettingsPage() {
  const [config, setConfig] = useState<ModelConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [healthStatus, setHealthStatus] = useState<HealthStatus>('unknown')
  const [localModels, setLocalModels] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  const loadConfig = useCallback(async () => {
    try {
      const cfg = await window.api.modelConfig.get()
      setConfig(cfg)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configuration')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadConfig() }, [loadConfig])

  // Check local server health on load and when URL changes
  const checkHealth = useCallback(async (url: string) => {
    if (!url) { setHealthStatus('unknown'); setLocalModels([]); return }
    setHealthStatus('checking')
    try {
      const result = await window.api.modelConfig.checkLocalHealth(url)
      setHealthStatus(result.available ? 'available' : 'unavailable')
      setLocalModels(result.models)
    } catch {
      setHealthStatus('unavailable')
      setLocalModels([])
    }
  }, [])

  useEffect(() => {
    if (config?.localServerUrl && healthStatus === 'unknown') {
      checkHealth(config.localServerUrl)
    }
  }, [config?.localServerUrl, healthStatus, checkHealth])

  const updateConfig = useCallback((updater: (prev: ModelConfig) => ModelConfig) => {
    setConfig(prev => {
      if (!prev) return prev
      const next = updater(prev)
      setDirty(true)
      setSaveMessage(null)
      return next
    })
  }, [])

  const handleSave = useCallback(async () => {
    if (!config) return
    setSaving(true)
    try {
      await window.api.modelConfig.save(config)
      setDirty(false)
      setSaveMessage('Configuration saved successfully')
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }, [config])

  const handlePresetChange = useCallback((mode: PresetMode) => {
    updateConfig(prev => {
      const localModel = mode === 'local'
        ? (prev.localDefaultModel || localModels[0] || '')
        : prev.localDefaultModel
      const features = mode === 'custom'
        ? prev.features
        : buildDefaultFeatures(mode, localModel)
      return { ...prev, presetMode: mode, features, localDefaultModel: localModel }
    })
  }, [updateConfig, localModels])

  const handleFeatureChange = useCallback((key: FeatureKey, assignment: FeatureModelAssignment) => {
    updateConfig(prev => ({
      ...prev,
      features: { ...prev.features, [key]: assignment },
    }))
  }, [updateConfig])

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-lg font-semibold text-primary">AI Models</h1>
          <p className="text-xs text-muted mt-0.5">Loading configuration...</p>
        </div>
        <div className="glass-card p-8 flex items-center justify-center">
          <div className="animate-spin w-5 h-5 border-2 border-accent-500 border-t-transparent rounded-full" />
        </div>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-lg font-semibold text-primary">AI Models</h1>
          <p className="text-xs text-muted mt-0.5">Configure AI model assignments for each feature</p>
        </div>
        {error && (
          <div className="glass-card p-4 border-l-2 border-red-400">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-primary">AI Models</h1>
          <p className="text-xs text-muted mt-0.5">Configure AI model assignments for each feature</p>
        </div>
        <div className="flex items-center gap-3">
          {saveMessage && (
            <span className="text-xs text-emerald-400">{saveMessage}</span>
          )}
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              dirty
                ? 'bg-accent-500 text-white hover:bg-accent-600'
                : 'bg-white/5 text-muted cursor-not-allowed'
            }`}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {error && (
        <div className="glass-card p-4 border-l-2 border-red-400">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Section 1: Preset Mode & Local Server */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold text-primary mb-4">Mode & Provider</h2>

        {/* Preset Buttons */}
        <div className="flex gap-2 mb-5">
          {(['claude', 'local', 'custom'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => handlePresetChange(mode)}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 ${
                config.presetMode === mode
                  ? mode === 'claude'
                    ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30'
                    : mode === 'local'
                      ? 'bg-purple-500/15 text-purple-400 ring-1 ring-purple-500/30'
                      : 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30'
                  : 'bg-white/5 text-secondary hover:bg-white/10'
              }`}
            >
              <div className="text-center">
                <div>{mode === 'claude' ? 'Claude' : mode === 'local' ? 'Local' : 'Custom'}</div>
                <div className="text-[10px] opacity-60 mt-0.5">
                  {mode === 'claude' ? 'All Claude models' : mode === 'local' ? 'All local models' : 'Mix & match'}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Local Server Config */}
        <div className="border-t border-white/5 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <label className="text-xs font-medium text-secondary">Local LLM Server URL</label>
            <HealthDot status={healthStatus} />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={config.localServerUrl}
              onChange={e => updateConfig(prev => ({ ...prev, localServerUrl: e.target.value }))}
              placeholder="http://localhost:8080"
              className="glass-input flex-1 text-sm"
            />
            <button
              onClick={() => checkHealth(config.localServerUrl)}
              className="glass-button px-3 py-2 text-xs"
            >
              Test
            </button>
          </div>
          {healthStatus === 'available' && localModels.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] text-muted uppercase tracking-wider mb-1.5">Detected Models</p>
              <div className="flex flex-wrap gap-1.5">
                {localModels.map(m => (
                  <span key={m} className="px-2 py-1 rounded bg-purple-500/10 text-purple-300 text-xs">{m}</span>
                ))}
              </div>
            </div>
          )}
          {healthStatus === 'unavailable' && (
            <p className="text-xs text-red-400 mt-2">
              Cannot reach server. Make sure OLMX or mlx_lm is running.
            </p>
          )}
        </div>

        {/* Local Default Model (shown in Local preset) */}
        {config.presetMode === 'local' && (
          <div className="border-t border-white/5 pt-4 mt-4">
            <label className="text-xs font-medium text-secondary block mb-2">Default Local Model</label>
            {localModels.length > 0 ? (
              <select
                value={config.localDefaultModel}
                onChange={e => {
                  const model = e.target.value
                  updateConfig(prev => ({
                    ...prev,
                    localDefaultModel: model,
                    features: buildDefaultFeatures('local', model),
                  }))
                }}
                className="glass-input text-sm w-full"
              >
                <option value="">Select a model...</option>
                {localModels.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={config.localDefaultModel}
                onChange={e => {
                  const model = e.target.value
                  updateConfig(prev => ({
                    ...prev,
                    localDefaultModel: model,
                    features: buildDefaultFeatures('local', model),
                  }))
                }}
                placeholder="Enter model name (e.g., mlx-community/Qwen3-32B-4bit)"
                className="glass-input text-sm w-full"
              />
            )}
          </div>
        )}
      </div>

      {/* Section 2: Feature Model Assignments */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-primary">Feature Model Assignments</h2>
          {config.presetMode !== 'custom' && (
            <span className="text-[10px] text-muted bg-white/5 px-2 py-1 rounded">
              Locked — switch to Custom to edit
            </span>
          )}
        </div>

        <div className="space-y-1">
          {ALL_FEATURE_KEYS.map(key => (
            <FeatureRow
              key={key}
              featureKey={key}
              assignment={config.features[key]}
              locked={config.presetMode !== 'custom'}
              localModels={localModels}
              onChange={assignment => handleFeatureChange(key, assignment)}
            />
          ))}
        </div>
      </div>

      {/* Section 3: Concurrency Settings */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold text-primary mb-4">Concurrency Limits</h2>
        <div className="grid grid-cols-3 gap-4">
          <ConcurrencyInput
            label="Claude Max"
            value={config.concurrency.claude.max}
            onChange={val => updateConfig(prev => ({
              ...prev,
              concurrency: { ...prev.concurrency, claude: { ...prev.concurrency.claude, max: val } },
            }))}
          />
          <ConcurrencyInput
            label="Claude Haiku Max"
            value={config.concurrency.claude.haikuMax}
            onChange={val => updateConfig(prev => ({
              ...prev,
              concurrency: { ...prev.concurrency, claude: { ...prev.concurrency.claude, haikuMax: val } },
            }))}
          />
          <ConcurrencyInput
            label="Local Max"
            value={config.concurrency.local.max}
            onChange={val => updateConfig(prev => ({
              ...prev,
              concurrency: { ...prev.concurrency, local: { ...prev.concurrency.local, max: val } },
            }))}
          />
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────

function HealthDot({ status }: { status: HealthStatus }) {
  const colors: Record<HealthStatus, string> = {
    unknown: 'bg-gray-400',
    checking: 'bg-yellow-400 animate-pulse',
    available: 'bg-emerald-400',
    unavailable: 'bg-red-400',
  }
  const labels: Record<HealthStatus, string> = {
    unknown: 'Not tested',
    checking: 'Checking...',
    available: 'Connected',
    unavailable: 'Unreachable',
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] text-muted">
      <span className={`w-2 h-2 rounded-full ${colors[status]}`} />
      {labels[status]}
    </span>
  )
}

function FeatureRow({
  featureKey,
  assignment,
  locked,
  localModels,
  onChange,
}: {
  featureKey: FeatureKey
  assignment: FeatureModelAssignment
  locked: boolean
  localModels: string[]
  onChange: (a: FeatureModelAssignment) => void
}) {
  const meta = FEATURE_REGISTRY[featureKey]
  const tierColors: Record<string, string> = {
    haiku: 'text-sky-400',
    sonnet: 'text-emerald-400',
    opus: 'text-amber-400',
  }

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-white/[0.03] transition-colors group">
      {/* Feature info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-primary">{meta.label}</span>
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${tierColors[meta.claudeTier] ?? 'text-muted'}`}>
            {meta.claudeTier}
          </span>
        </div>
        <p className="text-[11px] text-muted truncate">{meta.description}</p>
      </div>

      {/* Provider badge */}
      <ProviderBadge provider={assignment.provider} />

      {/* Model selector */}
      <div className="w-[260px] flex-shrink-0">
        {locked ? (
          <div className="glass-input text-xs py-2 opacity-60 cursor-not-allowed truncate">
            {assignment.model || '(none)'}
          </div>
        ) : (
          <div className="flex gap-1.5">
            <select
              value={assignment.provider}
              onChange={e => {
                const provider = e.target.value as LlmProvider
                const model = provider === 'claude'
                  ? meta.defaultClaudeModel
                  : (localModels[0] || '')
                onChange({ provider, model })
              }}
              className="glass-input text-xs py-2 w-[80px] flex-shrink-0"
            >
              <option value="claude">Claude</option>
              <option value="local">Local</option>
            </select>
            {assignment.provider === 'claude' ? (
              <select
                value={assignment.model}
                onChange={e => onChange({ ...assignment, model: e.target.value })}
                className="glass-input text-xs py-2 flex-1"
              >
                {CLAUDE_MODELS.map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            ) : localModels.length > 0 ? (
              <select
                value={assignment.model}
                onChange={e => onChange({ ...assignment, model: e.target.value })}
                className="glass-input text-xs py-2 flex-1"
              >
                <option value="">Select model...</option>
                {localModels.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={assignment.model}
                onChange={e => onChange({ ...assignment, model: e.target.value })}
                placeholder="Model name"
                className="glass-input text-xs py-2 flex-1"
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ProviderBadge({ provider }: { provider: LlmProvider }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider flex-shrink-0 ${
      provider === 'claude'
        ? 'bg-emerald-500/10 text-emerald-400'
        : 'bg-purple-500/10 text-purple-400'
    }`}>
      {provider}
    </span>
  )
}

function ConcurrencyInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (val: number) => void
}) {
  return (
    <div>
      <label className="text-xs font-medium text-secondary block mb-1.5">{label}</label>
      <input
        type="number"
        min={1}
        max={50}
        value={value}
        onChange={e => onChange(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
        className="glass-input text-sm w-full"
      />
    </div>
  )
}
