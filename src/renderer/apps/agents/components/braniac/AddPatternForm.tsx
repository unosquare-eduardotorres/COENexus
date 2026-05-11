import { useCallback, useEffect, useState } from 'react'
import { Plus, Sparkles, Check, X, Loader2, Save } from 'lucide-react'
import { braniacService } from '../../services/braniacService'
import { createRendererLogger } from '../../../../shared/utils/rendererLogger'
import { reportError } from '../../../../shared/utils/reportError'

const log = createRendererLogger('AddPatternForm')

interface AddPatternFormProps {
  onPatternCreated: () => void
  defaultAccount?: string
  defaultStakeholder?: string | null
}

export default function AddPatternForm({ onPatternCreated, defaultAccount, defaultStakeholder }: AddPatternFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [account, setAccount] = useState(defaultAccount ?? '')
  const [stakeholder, setStakeholder] = useState<string | null>(defaultStakeholder ?? null)
  const [rawText, setRawText] = useState('')
  const [patternName, setPatternName] = useState('')
  const [patternText, setPatternText] = useState('')
  const [isBeautifying, setIsBeautifying] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState<{ name: string; text: string } | null>(null)
  const [accounts, setAccounts] = useState<string[]>([])
  const [stakeholders, setStakeholders] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    braniacService.getAccounts().then(res => {
      if (res.success && res.data) setAccounts(res.data)
    })
  }, [])

  useEffect(() => {
    if (!account) {
      setStakeholders([])
      return
    }
    braniacService.getStakeholders({ account }).then(res => {
      if (res.success && res.data) setStakeholders(res.data)
    })
  }, [account])

  useEffect(() => {
    if (defaultAccount) setAccount(defaultAccount)
  }, [defaultAccount])

  useEffect(() => {
    if (defaultStakeholder !== undefined) setStakeholder(defaultStakeholder ?? null)
  }, [defaultStakeholder])

  const clearForm = useCallback(() => {
    setRawText('')
    setPatternName('')
    setPatternText('')
    setAiSuggestion(null)
    setError(null)
    if (!defaultAccount) setAccount('')
    if (defaultStakeholder === undefined) setStakeholder(null)
  }, [defaultAccount, defaultStakeholder])

  const handleBeautify = useCallback(async () => {
    if (!rawText.trim() || !account) return
    setIsBeautifying(true)
    setError(null)
    try {
      const res = await braniacService.beautifyPattern({
        text: rawText,
        account,
        stakeholder,
      })
      if (res.success && res.data) {
        setAiSuggestion({
          name: res.data.pattern_name,
          text: res.data.pattern_text,
        })
      } else {
        setError(res.error ?? 'Failed to beautify pattern')
      }
    } catch (err) {
      const msg = reportError(err)
      setError(msg)
      log.error('Beautify failed', { error: msg })
    } finally {
      setIsBeautifying(false)
    }
  }, [rawText, account, stakeholder])

  const handleUseSuggestion = useCallback(() => {
    if (!aiSuggestion) return
    setPatternName(aiSuggestion.name)
    setPatternText(aiSuggestion.text)
  }, [aiSuggestion])

  const handleSave = useCallback(async () => {
    if (!account || !patternName.trim() || !patternText.trim()) {
      setError('Account, pattern name, and pattern text are required.')
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      const res = await braniacService.createPattern({
        pattern_name: patternName.trim(),
        pattern_text: patternText.trim(),
        account,
        stakeholder,
      })
      if (res.success) {
        setSuccessMessage('Pattern saved successfully!')
        clearForm()
        onPatternCreated()
        setTimeout(() => setSuccessMessage(null), 3000)
      } else {
        setError(res.error ?? 'Failed to save pattern')
      }
    } catch (err) {
      const msg = reportError(err)
      setError(msg)
      log.error('Save pattern failed', { error: msg })
    } finally {
      setIsSaving(false)
    }
  }, [account, stakeholder, patternName, patternText, clearForm, onPatternCreated])

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-violet-600 dark:text-violet-400 border border-dashed border-violet-300 dark:border-violet-500/40 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors w-full justify-center"
      >
        <Plus className="h-4 w-4" />
        Add Pattern
      </button>
    )
  }

  return (
    <div className="glass-panel rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-dark-border/50">
        <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
          <Plus className="h-4 w-4 text-violet-500" />
          Add New Pattern
        </h3>
        <button
          onClick={() => { setIsOpen(false); clearForm() }}
          className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
        >
          <X className="h-4 w-4 text-muted" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {error && (
          <div className="p-2.5 rounded-lg bg-red-50/50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="p-2.5 rounded-lg bg-green-50/50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20">
            <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5" />
              {successMessage}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">Account</label>
            <select
              value={account}
              onChange={e => { setAccount(e.target.value); setStakeholder(null) }}
              className="glass-select w-full text-sm py-2 pl-3 pr-8 rounded-lg"
              disabled={!!defaultAccount}
            >
              <option value="">Select account…</option>
              {accounts.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-secondary mb-1">Stakeholder</label>
            <select
              value={stakeholder ?? ''}
              onChange={e => setStakeholder(e.target.value || null)}
              className="glass-select w-full text-sm py-2 pl-3 pr-8 rounded-lg"
              disabled={!account || (defaultStakeholder !== undefined && defaultStakeholder !== null)}
            >
              <option value="">Account-wide</option>
              {stakeholders.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-secondary mb-1">Pattern Text</label>
          <textarea
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            placeholder="Type your observation in natural language, e.g. 'Ali usually prefers senior LATAM developers and doesn't go below $45/hr…'"
            className="glass-input w-full text-sm p-3 rounded-lg resize-none"
            rows={3}
          />
        </div>

        <button
          onClick={handleBeautify}
          disabled={isBeautifying || !rawText.trim() || !account}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-500/20 hover:bg-violet-200 dark:hover:bg-violet-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isBeautifying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Refining your pattern…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Beautify with AI
            </>
          )}
        </button>

        {aiSuggestion && (
          <div className="glass-panel-subtle p-3 rounded-xl space-y-2 border border-violet-200 dark:border-violet-500/30">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" />
                AI Suggestion
              </h4>
              <button
                onClick={handleUseSuggestion}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-500/20 hover:bg-green-200 dark:hover:bg-green-500/30 transition-colors"
              >
                <Check className="h-3 w-3" />
                Use This
              </button>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted">Name:</p>
              <p className="text-sm font-medium text-primary">{aiSuggestion.name}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted">Text:</p>
              <p className="text-sm text-secondary leading-relaxed">{aiSuggestion.text}</p>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-secondary mb-1">Pattern Name</label>
          <input
            type="text"
            value={patternName}
            onChange={e => setPatternName(e.target.value)}
            placeholder="e.g. LATAM Senior Developer Preference"
            className="glass-input w-full text-sm px-3 py-2 rounded-lg"
          />
        </div>

        {(patternText || aiSuggestion) && (
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">Refined Pattern Text</label>
            <textarea
              value={patternText}
              onChange={e => setPatternText(e.target.value)}
              placeholder="Edit the pattern text if needed…"
              className="glass-input w-full text-sm p-3 rounded-lg resize-none"
              rows={3}
            />
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={isSaving || !account || !patternName.trim() || !patternText.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Pattern
          </button>
          <button
            onClick={clearForm}
            className="px-4 py-2 rounded-lg text-sm font-medium text-muted hover:text-primary hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  )
}
