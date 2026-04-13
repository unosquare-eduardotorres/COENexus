import { useState, useEffect } from 'react'
import { Plus, Trash2, Sparkles } from 'lucide-react'

interface Note {
  id: string
  note_title: string
  note_text: string
  tags_json: string
  is_active: number
  created_at: string
}

export default function ContextNotesPanel() {
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [compiledText, setCompiledText] = useState<string | null>(null)
  const [compiling, setCompiling] = useState(false)
  const [form, setForm] = useState({ note_title: '', note_text: '' })
  const [showForm, setShowForm] = useState(false)

  useEffect(() => { loadNotes() }, [])

  async function loadNotes() {
    try {
      const result = await window.api?.scout9?.listNotes?.()
      if (result?.success && result.data) setNotes(result.data as Note[])
    } catch {}
  }

  async function handleCreate() {
    if (!form.note_title.trim() || !form.note_text.trim()) return
    try {
      await window.api?.scout9?.createNote?.(form)
      setForm({ note_title: '', note_text: '' })
      setShowForm(false)
      loadNotes()
    } catch {}
  }

  async function handleDelete(id: string) {
    try {
      await window.api?.scout9?.deleteNote?.(id)
      if (selectedNote?.id === id) setSelectedNote(null)
      loadNotes()
    } catch {}
  }

  async function handleCompile() {
    setCompiling(true)
    try {
      const result = await window.api?.scout9?.compileKnowledgeBase?.()
      if (result?.success && result.data) {
        const d = result.data as { compiled_markdown: string }
        setCompiledText(d.compiled_markdown)
      }
    } catch {} finally {
      setCompiling(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-primary">Context Notes</h4>
        <div className="flex gap-2">
          <button
            onClick={handleCompile}
            disabled={compiling}
            className="glass-button px-2 py-1 text-[10px] font-semibold inline-flex items-center gap-1 text-violet-400"
          >
            <Sparkles size={12} />
            {compiling ? 'Compiling...' : 'Compile'}
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="glass-button px-2 py-1 text-[10px] font-semibold inline-flex items-center gap-1 text-orange-400"
          >
            <Plus size={12} />
            Add Note
          </button>
        </div>
      </div>

      {showForm && (
        <div className="glass-card p-4 space-y-2">
          <input
            type="text"
            className="glass-input w-full px-3 py-1.5 text-xs"
            placeholder="Note title"
            value={form.note_title}
            onChange={e => setForm(f => ({ ...f, note_title: e.target.value }))}
          />
          <textarea
            className="glass-input w-full px-3 py-2 text-xs min-h-[80px] resize-none"
            placeholder="Note content — context about clients, stakeholders, preferences..."
            value={form.note_text}
            onChange={e => setForm(f => ({ ...f, note_text: e.target.value }))}
          />
          <div className="flex gap-2">
            <button onClick={handleCreate} className="glass-button px-3 py-1.5 text-xs font-semibold text-orange-400 bg-orange-500/15">Create</button>
            <button onClick={() => setShowForm(false)} className="glass-button px-3 py-1.5 text-xs text-secondary">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Human Notes</span>
          {notes.length === 0 && <p className="text-xs text-muted py-4 text-center">No notes yet.</p>}
          {notes.map(note => (
            <div
              key={note.id}
              onClick={() => setSelectedNote(note)}
              className={`glass-panel-subtle p-3 rounded-xl cursor-pointer transition-all hover:bg-white/40 dark:hover:bg-dark-hover/40 ${
                selectedNote?.id === note.id ? 'ring-1 ring-orange-500/30' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h5 className="text-xs font-semibold text-primary">{note.note_title}</h5>
                  <p className="text-[10px] text-secondary mt-0.5 line-clamp-2">{note.note_text}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(note.id) }} className="text-muted hover:text-red-400 p-1 flex-shrink-0">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Compiled Output</span>
          <div className="glass-panel-subtle p-3 rounded-xl min-h-[200px]">
            {!compiledText && (
              <p className="text-xs text-muted text-center py-8">Click "Compile" to generate the compiled knowledge output.</p>
            )}
            {compiledText && (
              <pre className="text-[11px] font-mono text-secondary whitespace-pre-wrap break-words">{compiledText}</pre>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
