import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'

interface Override {
  id: string
  client_id: string
  rule_id: string
  override_text: string
  is_active: number
  created_at: string
}

export default function ClientOverridesPanel() {
  const [overrides, setOverrides] = useState<Override[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ client_id: '', rule_id: '', override_text: '' })

  useEffect(() => { loadOverrides() }, [])

  async function loadOverrides() {
    try {
      const result = await window.api?.scout9?.listOverrides?.()
      if (result?.success && result.data) setOverrides(result.data as Override[])
    } catch {}
  }

  async function handleCreate() {
    if (!form.client_id.trim() || !form.override_text.trim()) return
    try {
      await window.api?.scout9?.createOverride?.(form)
      setForm({ client_id: '', rule_id: '', override_text: '' })
      setShowForm(false)
      loadOverrides()
    } catch {}
  }

  async function handleDelete(id: string) {
    try {
      await window.api?.scout9?.deleteOverride?.(id)
      loadOverrides()
    } catch {}
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-primary">Client Overrides</h4>
        <button
          onClick={() => setShowForm(!showForm)}
          className="glass-button px-2 py-1 text-[10px] font-semibold inline-flex items-center gap-1 text-amber-400"
        >
          <Plus size={12} />
          Add Override
        </button>
      </div>

      {showForm && (
        <div className="glass-card p-4 space-y-2">
          <input
            type="text"
            className="glass-input w-full px-3 py-1.5 text-xs"
            placeholder="Client name"
            value={form.client_id}
            onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
          />
          <input
            type="text"
            className="glass-input w-full px-3 py-1.5 text-xs"
            placeholder="Rule ID to override"
            value={form.rule_id}
            onChange={e => setForm(f => ({ ...f, rule_id: e.target.value }))}
          />
          <textarea
            className="glass-input w-full px-3 py-2 text-xs min-h-[60px] resize-none"
            placeholder="Override parameters or text"
            value={form.override_text}
            onChange={e => setForm(f => ({ ...f, override_text: e.target.value }))}
          />
          <div className="flex gap-2">
            <button onClick={handleCreate} className="glass-button px-3 py-1.5 text-xs font-semibold text-amber-400 bg-amber-500/15">Create</button>
            <button onClick={() => setShowForm(false)} className="glass-button px-3 py-1.5 text-xs text-secondary">Cancel</button>
          </div>
        </div>
      )}

      {overrides.length === 0 && !showForm && (
        <p className="text-xs text-muted text-center py-6">No client overrides defined. Overrides customize rule behavior for specific clients.</p>
      )}

      {overrides.map(ov => (
        <div key={ov.id} className="glass-panel-subtle p-3 rounded-xl">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-primary">{ov.client_id}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-mono">Rule: {ov.rule_id}</span>
              </div>
              <p className="text-[11px] text-secondary mt-1">{ov.override_text}</p>
            </div>
            <button onClick={() => handleDelete(ov.id)} className="text-muted hover:text-red-400 p-1 flex-shrink-0">
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
