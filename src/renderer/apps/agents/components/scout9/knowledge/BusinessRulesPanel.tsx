import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'

interface Rule {
  id: string
  rule_name: string
  rule_text: string
  priority: number
  is_active: number
  source: string
  created_at: string
}

export default function BusinessRulesPanel() {
  const [rules, setRules] = useState<Rule[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ rule_name: '', rule_text: '', priority: 100, source: 'manual' })

  useEffect(() => { loadRules() }, [])

  async function loadRules() {
    try {
      const result = await window.api?.scout9?.listRules?.()
      if (result?.success && result.data) setRules(result.data as Rule[])
    } catch {}
  }

  async function handleSave() {
    if (!form.rule_name.trim() || !form.rule_text.trim()) return
    try {
      if (editingId) {
        await window.api?.scout9?.updateRule?.({ id: editingId, ...form })
      } else {
        await window.api?.scout9?.createRule?.(form)
      }
      setShowForm(false)
      setEditingId(null)
      setForm({ rule_name: '', rule_text: '', priority: 100, source: 'manual' })
      loadRules()
    } catch {}
  }

  async function handleDelete(id: string) {
    try {
      await window.api?.scout9?.deleteRule?.(id)
      loadRules()
    } catch {}
  }

  async function handleToggle(rule: Rule) {
    try {
      await window.api?.scout9?.updateRule?.({ id: rule.id, is_active: rule.is_active === 1 ? 0 : 1 })
      loadRules()
    } catch {}
  }

  function startEdit(rule: Rule) {
    setEditingId(rule.id)
    setForm({ rule_name: rule.rule_name, rule_text: rule.rule_text, priority: rule.priority, source: rule.source })
    setShowForm(true)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-primary">Business Rules</h4>
        <button
          onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ rule_name: '', rule_text: '', priority: 100, source: 'manual' }) }}
          className="glass-button px-2 py-1 text-[10px] font-semibold inline-flex items-center gap-1 text-blue-400"
        >
          <Plus size={12} />
          Add Rule
        </button>
      </div>

      {showForm && (
        <div className="glass-card p-4 space-y-2">
          <input
            type="text"
            className="glass-input w-full px-3 py-1.5 text-xs"
            placeholder="Rule name"
            value={form.rule_name}
            onChange={e => setForm(f => ({ ...f, rule_name: e.target.value }))}
          />
          <textarea
            className="glass-input w-full px-3 py-2 text-xs min-h-[60px] resize-none"
            placeholder="Rule text — the instruction for the agent"
            value={form.rule_text}
            onChange={e => setForm(f => ({ ...f, rule_text: e.target.value }))}
          />
          <div className="flex gap-2">
            <input
              type="number"
              className="glass-input w-20 px-2 py-1.5 text-xs"
              placeholder="Priority"
              value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 100 }))}
            />
            <button onClick={handleSave} className="glass-button px-3 py-1.5 text-xs font-semibold text-blue-400 bg-blue-500/15">
              {editingId ? 'Update' : 'Create'}
            </button>
            <button onClick={() => { setShowForm(false); setEditingId(null) }} className="glass-button px-3 py-1.5 text-xs text-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}

      {rules.length === 0 && !showForm && (
        <p className="text-xs text-muted text-center py-6">No rules defined yet.</p>
      )}

      {rules.map(rule => (
        <div key={rule.id} className={`glass-panel-subtle p-3 rounded-xl ${rule.is_active === 0 ? 'opacity-50' : ''}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h5 className="text-xs font-semibold text-primary">{rule.rule_name}</h5>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-400/15 text-muted font-mono">P{rule.priority}</span>
              </div>
              <p className="text-[11px] text-secondary mt-1 line-clamp-2">{rule.rule_text}</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => handleToggle(rule)} className="text-muted hover:text-primary p-1">
                {rule.is_active === 1 ? <ToggleRight size={14} className="text-green-400" /> : <ToggleLeft size={14} />}
              </button>
              <button onClick={() => startEdit(rule)} className="text-muted hover:text-primary p-1">
                <Pencil size={12} />
              </button>
              <button onClick={() => handleDelete(rule.id)} className="text-muted hover:text-red-400 p-1">
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
