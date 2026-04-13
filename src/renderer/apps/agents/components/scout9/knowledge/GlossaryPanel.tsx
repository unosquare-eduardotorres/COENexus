import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'

interface GlossaryTerm {
  id: string
  term: string
  definition: string
  synonyms: string
  is_active: number
  created_at: string
}

export default function GlossaryPanel() {
  const [terms, setTerms] = useState<GlossaryTerm[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ term: '', definition: '', synonyms: '' })

  useEffect(() => { loadTerms() }, [])

  async function loadTerms() {
    try {
      const result = await window.api?.scout9?.listGlossary?.()
      if (result?.success && result.data) setTerms(result.data as GlossaryTerm[])
    } catch {}
  }

  async function handleSave() {
    if (!form.term.trim() || !form.definition.trim()) return
    try {
      if (editingId) {
        await window.api?.scout9?.updateGlossaryTerm?.({ id: editingId, ...form })
      } else {
        await window.api?.scout9?.createGlossaryTerm?.(form)
      }
      setShowForm(false)
      setEditingId(null)
      setForm({ term: '', definition: '', synonyms: '' })
      loadTerms()
    } catch {}
  }

  async function handleDelete(id: string) {
    try {
      await window.api?.scout9?.deleteGlossaryTerm?.(id)
      loadTerms()
    } catch {}
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-primary">Glossary</h4>
        <button
          onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ term: '', definition: '', synonyms: '' }) }}
          className="glass-button px-2 py-1 text-[10px] font-semibold inline-flex items-center gap-1 text-green-400"
        >
          <Plus size={12} />
          Add Term
        </button>
      </div>

      {showForm && (
        <div className="glass-card p-4 space-y-2">
          <input
            type="text"
            className="glass-input w-full px-3 py-1.5 text-xs"
            placeholder="Term"
            value={form.term}
            onChange={e => setForm(f => ({ ...f, term: e.target.value }))}
          />
          <textarea
            className="glass-input w-full px-3 py-2 text-xs min-h-[60px] resize-none"
            placeholder="Definition"
            value={form.definition}
            onChange={e => setForm(f => ({ ...f, definition: e.target.value }))}
          />
          <input
            type="text"
            className="glass-input w-full px-3 py-1.5 text-xs"
            placeholder="Synonyms (comma-separated)"
            value={form.synonyms}
            onChange={e => setForm(f => ({ ...f, synonyms: e.target.value }))}
          />
          <div className="flex gap-2">
            <button onClick={handleSave} className="glass-button px-3 py-1.5 text-xs font-semibold text-green-400 bg-green-500/15">
              {editingId ? 'Update' : 'Create'}
            </button>
            <button onClick={() => { setShowForm(false); setEditingId(null) }} className="glass-button px-3 py-1.5 text-xs text-secondary">Cancel</button>
          </div>
        </div>
      )}

      {terms.length === 0 && !showForm && (
        <p className="text-xs text-muted text-center py-6">No glossary terms defined yet.</p>
      )}

      <div className="grid gap-2">
        {terms.map(term => (
          <div key={term.id} className="glass-panel-subtle p-3 rounded-xl">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-primary">{term.term}</span>
                <p className="text-[11px] text-secondary mt-0.5">{term.definition}</p>
                {term.synonyms && <p className="text-[9px] text-muted mt-0.5">Synonyms: {term.synonyms}</p>}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => { setEditingId(term.id); setForm({ term: term.term, definition: term.definition, synonyms: term.synonyms }); setShowForm(true) }} className="text-muted hover:text-primary p-1">
                  <Pencil size={12} />
                </button>
                <button onClick={() => handleDelete(term.id)} className="text-muted hover:text-red-400 p-1">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
