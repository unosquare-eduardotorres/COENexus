import { useState, useEffect } from 'react'
import { Save, RotateCcw, Plus, Check, FileText, Cpu, Brain, Wrench, Timer } from 'lucide-react'
import type { Scout9AgentConfig } from '../../../../../shared/ipc-types'

interface PromptVersion {
  id: string
  version_label: string
  prompt_text: string
  is_active: number
  created_at: string
  activated_at: string | null
}

interface FormConfig {
  sonnet_model: string
  haiku_model: string
  temperature: number
  token_budget_ceiling: number
  include_patterns: 0 | 1
  include_glossary: 0 | 1
  include_notes: 0 | 1
  max_tool_calls_per_run: number
  max_tool_calls_per_candidate: number
  tool_timeout_ms: number
  max_run_duration_ms: number
  max_turns: number
  stream_watchdog_ms: number
}

const DEFAULTS: FormConfig = {
  sonnet_model: 'claude-sonnet-4-20250514',
  haiku_model: 'claude-haiku-3-5-20241022',
  temperature: 0.2,
  token_budget_ceiling: 6000,
  include_patterns: 1,
  include_glossary: 1,
  include_notes: 1,
  max_tool_calls_per_run: 20,
  max_tool_calls_per_candidate: 3,
  tool_timeout_ms: 5000,
  max_run_duration_ms: 600000,
  max_turns: 50,
  stream_watchdog_ms: 120000,
}

export default function SettingsTab() {
  const [config, setConfig] = useState<Scout9AgentConfig | null>(null)
  const [prompts, setPrompts] = useState<PromptVersion[]>([])
  const [formConfig, setFormConfig] = useState<FormConfig>({ ...DEFAULTS })
  const [newPromptText, setNewPromptText] = useState('')
  const [newPromptLabel, setNewPromptLabel] = useState('')
  const [showNewPrompt, setShowNewPrompt] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const [configResult, promptsResult] = await Promise.all([
        window.api?.scout9?.getConfig?.(),
        window.api?.scout9?.listPromptVersions?.(),
      ])
      if (configResult?.success && configResult.data) {
        const c = configResult.data as Scout9AgentConfig
        setConfig(c)
        setFormConfig({
          sonnet_model: c.sonnet_model ?? DEFAULTS.sonnet_model,
          haiku_model: c.haiku_model ?? DEFAULTS.haiku_model,
          temperature: c.temperature ?? DEFAULTS.temperature,
          token_budget_ceiling: c.token_budget_ceiling ?? DEFAULTS.token_budget_ceiling,
          include_patterns: c.include_patterns ?? DEFAULTS.include_patterns,
          include_glossary: c.include_glossary ?? DEFAULTS.include_glossary,
          include_notes: c.include_notes ?? DEFAULTS.include_notes,
          max_tool_calls_per_run: c.max_tool_calls_per_run ?? DEFAULTS.max_tool_calls_per_run,
          max_tool_calls_per_candidate: c.max_tool_calls_per_candidate ?? DEFAULTS.max_tool_calls_per_candidate,
          tool_timeout_ms: c.tool_timeout_ms ?? DEFAULTS.tool_timeout_ms,
          max_run_duration_ms: c.max_run_duration_ms ?? DEFAULTS.max_run_duration_ms,
          max_turns: c.max_turns ?? DEFAULTS.max_turns,
          stream_watchdog_ms: c.stream_watchdog_ms ?? DEFAULTS.stream_watchdog_ms,
        })
      }
      if (promptsResult?.success && promptsResult.data) {
        setPrompts(promptsResult.data as PromptVersion[])
      }
    } catch {}
  }

  async function handleSave() {
    setSaving(true)
    try {
      await window.api?.scout9?.updateConfig?.(formConfig)
      loadData()
    } catch {} finally {
      setSaving(false)
    }
  }

  function handleReset() {
    setFormConfig({ ...DEFAULTS })
  }

  async function handleCreatePrompt() {
    if (!newPromptLabel.trim() || !newPromptText.trim()) return
    try {
      await window.api?.scout9?.createPromptVersion?.({ version_label: newPromptLabel, prompt_text: newPromptText })
      setShowNewPrompt(false)
      setNewPromptLabel('')
      setNewPromptText('')
      loadData()
    } catch {}
  }

  async function handleActivatePrompt(id: string) {
    try {
      await window.api?.scout9?.activatePromptVersion?.({ id })
      loadData()
    } catch {}
  }

  function updateField<K extends keyof FormConfig>(key: K, value: FormConfig[K]) {
    setFormConfig(f => ({ ...f, [key]: value }))
  }

  return (
    <div className="space-y-4">
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileText size={16} className="text-amber-400" />
          <h3 className="text-sm font-semibold text-primary">System Prompt</h3>
        </div>

        <div className="space-y-2">
          {prompts.length === 0 && !showNewPrompt && (
            <p className="text-xs text-muted">No prompt versions created yet.</p>
          )}
          {prompts.map(p => (
            <div key={p.id} className={`glass-panel-subtle p-3 rounded-xl ${p.is_active === 1 ? 'ring-1 ring-amber-500/30' : ''}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-primary">{p.version_label}</span>
                  {p.is_active === 1 && (
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-green-500/15 text-green-400">ACTIVE</span>
                  )}
                  <span className="text-[9px] text-muted">{new Date(p.created_at).toLocaleDateString()}</span>
                </div>
                {p.is_active === 0 && (
                  <button
                    onClick={() => handleActivatePrompt(p.id)}
                    className="glass-button px-2 py-1 text-[10px] font-semibold text-amber-400"
                  >
                    <Check size={10} className="inline mr-1" />
                    Activate
                  </button>
                )}
              </div>
              <pre className="text-[10px] font-mono text-secondary mt-2 max-h-24 overflow-y-auto whitespace-pre-wrap">{p.prompt_text.slice(0, 300)}{p.prompt_text.length > 300 ? '...' : ''}</pre>
            </div>
          ))}

          {showNewPrompt && (
            <div className="glass-card p-4 space-y-2">
              <input
                type="text"
                className="glass-input w-full px-3 py-1.5 text-xs"
                placeholder="Version label (e.g. v2-improved-scoring)"
                value={newPromptLabel}
                onChange={e => setNewPromptLabel(e.target.value)}
              />
              <textarea
                className="glass-input w-full px-3 py-2 text-xs font-mono min-h-[120px] resize-y"
                placeholder="System prompt text..."
                value={newPromptText}
                onChange={e => setNewPromptText(e.target.value)}
              />
              <div className="flex gap-2">
                <button onClick={handleCreatePrompt} className="glass-button px-3 py-1.5 text-xs font-semibold text-amber-400 bg-amber-500/15">Create</button>
                <button onClick={() => setShowNewPrompt(false)} className="glass-button px-3 py-1.5 text-xs text-secondary">Cancel</button>
              </div>
            </div>
          )}

          {!showNewPrompt && (
            <button
              onClick={() => setShowNewPrompt(true)}
              className="glass-button px-2.5 py-1.5 text-[10px] font-semibold inline-flex items-center gap-1 text-amber-400"
            >
              <Plus size={12} />
              New Version
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Cpu size={16} className="text-amber-400" />
            <h3 className="text-sm font-semibold text-primary">AI Models</h3>
          </div>
          <div className="space-y-2">
            <div>
              <label className="text-[10px] text-muted uppercase tracking-wider">Analysis Model (Sonnet)</label>
              <input
                type="text"
                className="glass-input w-full mt-0.5 px-3 py-1.5 text-xs"
                value={formConfig.sonnet_model}
                onChange={e => updateField('sonnet_model', e.target.value)}
              />
              <p className="text-[9px] text-muted mt-0.5">Deep analysis model for candidate scoring</p>
            </div>
            <div>
              <label className="text-[10px] text-muted uppercase tracking-wider">Fast Filter Model (Haiku)</label>
              <input
                type="text"
                className="glass-input w-full mt-0.5 px-3 py-1.5 text-xs"
                value={formConfig.haiku_model}
                onChange={e => updateField('haiku_model', e.target.value)}
              />
              <p className="text-[9px] text-muted mt-0.5">Quick pre-filter model</p>
            </div>
            <div>
              <label className="text-[10px] text-muted uppercase tracking-wider">Temperature</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="1"
                className="glass-input w-full mt-0.5 px-3 py-1.5 text-xs"
                value={formConfig.temperature}
                onChange={e => updateField('temperature', parseFloat(e.target.value) || 0)}
              />
              <p className="text-[9px] text-muted mt-0.5">Response randomness (0 = deterministic)</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Brain size={16} className="text-amber-400" />
            <h3 className="text-sm font-semibold text-primary">Knowledge Budget</h3>
          </div>
          <div className="space-y-2">
            <div>
              <label className="text-[10px] text-muted uppercase tracking-wider">Token Budget Ceiling</label>
              <input
                type="number"
                className="glass-input w-full mt-0.5 px-3 py-1.5 text-xs"
                value={formConfig.token_budget_ceiling}
                onChange={e => updateField('token_budget_ceiling', parseInt(e.target.value) || 6000)}
              />
              <p className="text-[9px] text-muted mt-0.5">Max tokens for rules + glossary + patterns + notes</p>
            </div>
            <div className="flex items-center gap-4 pt-1">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formConfig.include_patterns === 1}
                  onChange={e => updateField('include_patterns', e.target.checked ? 1 : 0)}
                  className="rounded border-gray-400/40 bg-transparent text-amber-400 focus:ring-amber-400/30"
                />
                <span className="text-[10px] text-secondary">Patterns</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formConfig.include_glossary === 1}
                  onChange={e => updateField('include_glossary', e.target.checked ? 1 : 0)}
                  className="rounded border-gray-400/40 bg-transparent text-amber-400 focus:ring-amber-400/30"
                />
                <span className="text-[10px] text-secondary">Glossary</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formConfig.include_notes === 1}
                  onChange={e => updateField('include_notes', e.target.checked ? 1 : 0)}
                  className="rounded border-gray-400/40 bg-transparent text-amber-400 focus:ring-amber-400/30"
                />
                <span className="text-[10px] text-secondary">Notes</span>
              </label>
            </div>
            <p className="text-[9px] text-muted">Toggle which knowledge types are included in brain assembly</p>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Wrench size={16} className="text-amber-400" />
            <h3 className="text-sm font-semibold text-primary">Tool Limits</h3>
          </div>
          <div className="space-y-2">
            <div>
              <label className="text-[10px] text-muted uppercase tracking-wider">Max Tool Calls per Run</label>
              <input
                type="number"
                className="glass-input w-full mt-0.5 px-3 py-1.5 text-xs"
                value={formConfig.max_tool_calls_per_run}
                onChange={e => updateField('max_tool_calls_per_run', parseInt(e.target.value) || 20)}
              />
              <p className="text-[9px] text-muted mt-0.5">Total tool invocations budget</p>
            </div>
            <div>
              <label className="text-[10px] text-muted uppercase tracking-wider">Max Tool Calls per Candidate</label>
              <input
                type="number"
                className="glass-input w-full mt-0.5 px-3 py-1.5 text-xs"
                value={formConfig.max_tool_calls_per_candidate}
                onChange={e => updateField('max_tool_calls_per_candidate', parseInt(e.target.value) || 3)}
              />
              <p className="text-[9px] text-muted mt-0.5">Tool calls budget per candidate</p>
            </div>
            <div>
              <label className="text-[10px] text-muted uppercase tracking-wider">Tool Timeout</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="glass-input w-full mt-0.5 px-3 py-1.5 text-xs"
                  value={formConfig.tool_timeout_ms}
                  onChange={e => updateField('tool_timeout_ms', parseInt(e.target.value) || 5000)}
                />
                <span className="text-[9px] text-muted whitespace-nowrap mt-0.5">ms</span>
              </div>
              <p className="text-[9px] text-muted mt-0.5">Max wait for a single tool response ({(formConfig.tool_timeout_ms / 1000).toFixed(0)}s)</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Timer size={16} className="text-amber-400" />
            <h3 className="text-sm font-semibold text-primary">Execution Limits</h3>
          </div>
          <div className="space-y-2">
            <div>
              <label className="text-[10px] text-muted uppercase tracking-wider">Max Run Duration</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="glass-input w-full mt-0.5 px-3 py-1.5 text-xs"
                  value={formConfig.max_run_duration_ms}
                  onChange={e => updateField('max_run_duration_ms', parseInt(e.target.value) || 600000)}
                />
                <span className="text-[9px] text-muted whitespace-nowrap mt-0.5">ms</span>
              </div>
              <p className="text-[9px] text-muted mt-0.5">Hard timeout for entire pipeline ({(formConfig.max_run_duration_ms / 60000).toFixed(0)} min)</p>
            </div>
            <div>
              <label className="text-[10px] text-muted uppercase tracking-wider">Max Turns</label>
              <input
                type="number"
                className="glass-input w-full mt-0.5 px-3 py-1.5 text-xs"
                value={formConfig.max_turns}
                onChange={e => updateField('max_turns', parseInt(e.target.value) || 50)}
              />
              <p className="text-[9px] text-muted mt-0.5">Max AI conversation turns</p>
            </div>
            <div>
              <label className="text-[10px] text-muted uppercase tracking-wider">Stream Watchdog</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="glass-input w-full mt-0.5 px-3 py-1.5 text-xs"
                  value={formConfig.stream_watchdog_ms}
                  onChange={e => updateField('stream_watchdog_ms', parseInt(e.target.value) || 120000)}
                />
                <span className="text-[9px] text-muted whitespace-nowrap mt-0.5">ms</span>
              </div>
              <p className="text-[9px] text-muted mt-0.5">Stall detection timeout ({(formConfig.stream_watchdog_ms / 60000).toFixed(0)} min)</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="glass-button px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5 bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 transition-colors"
        >
          <Save size={14} />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        <button
          onClick={handleReset}
          className="glass-button px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5 text-secondary"
        >
          <RotateCcw size={14} />
          Reset Defaults
        </button>
      </div>
    </div>
  )
}
