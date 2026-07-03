import { useState, useCallback, memo } from 'react'
import type { PresentationEntry } from '../../types'

interface PresentationEntryCardProps {
  entry: PresentationEntry
  onUpdate: (id: number, field: string, value: unknown) => void
  onGenerateProfile: (entry: PresentationEntry) => void
  generating: boolean
}

const AVAILABILITY_OPTIONS = ['Immediate', '1 Week', '2 Weeks', '3 Weeks', '4 Weeks', '6 Weeks', '8 Weeks']

function PresentationEntryCardInner({ entry, onUpdate, onGenerateProfile, generating }: PresentationEntryCardProps) {
  const [newSkill, setNewSkill] = useState('')

  const handleAddSkill = useCallback(() => {
    if (!newSkill.trim()) return
    const updated = [...entry.techStack, newSkill.trim()]
    onUpdate(entry.id, 'techStack', updated)
    setNewSkill('')
  }, [entry.id, entry.techStack, newSkill, onUpdate])

  const handleRemoveSkill = useCallback((index: number) => {
    const updated = entry.techStack.filter((_, i) => i !== index)
    onUpdate(entry.id, 'techStack', updated)
  }, [entry.id, entry.techStack, onUpdate])

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${entry.sourceType === 'candidate' ? 'bg-accent-500' : 'bg-emerald-500'}`} />
          <div>
            <h4 className="font-semibold text-primary">{entry.fullName}</h4>
            <span className="text-sm text-muted">{entry.seniority} {entry.mainSkill} · {entry.country}</span>
          </div>
        </div>
        <button
          onClick={() => onGenerateProfile(entry)}
          disabled={generating}
          className="glass-button px-3 py-1.5 text-sm flex items-center gap-2"
        >
          {generating ? (
            <div className="w-4 h-4 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <span>✨</span>
          )}
          Generate Profile
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-secondary mb-1">Years of Experience</label>
          <input
            type="text"
            className="glass-input w-full text-sm"
            placeholder="e.g., 8+"
            value={entry.yearsOfExperience}
            onChange={e => onUpdate(entry.id, 'yearsOfExperience', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-secondary mb-1">Availability</label>
          <select
            className="glass-select w-full text-sm"
            value={entry.availability}
            onChange={e => onUpdate(entry.id, 'availability', e.target.value)}
          >
            <option value="">Select...</option>
            {AVAILABILITY_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-secondary mb-1">Recommended Rate</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
            <input
              type="text"
              className="glass-input w-full text-sm pl-7"
              placeholder="52"
              value={entry.recommendedRate}
              onChange={e => onUpdate(entry.id, 'recommendedRate', e.target.value)}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-xs">USD/hr</span>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-secondary mb-1">Professional Summary</label>
        <textarea
          className="glass-input w-full text-sm resize-none"
          rows={3}
          placeholder="AI-generated 2-3 sentence pitch highlighting fit for the role..."
          value={entry.professionalSummary}
          onChange={e => onUpdate(entry.id, 'professionalSummary', e.target.value)}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-secondary mb-1">Domain Experience</label>
        <input
          type="text"
          className="glass-input w-full text-sm"
          placeholder="Banking, Retail, Healthcare"
          value={entry.domainExperience}
          onChange={e => onUpdate(entry.id, 'domainExperience', e.target.value)}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-secondary mb-1">Technical Stack</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {entry.techStack.map((skill, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-accent-50 text-accent-700 dark:bg-accent-900/20 dark:text-accent-400"
            >
              {skill}
              <button onClick={() => handleRemoveSkill(idx)} className="text-accent-400 hover:text-red-500">×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            className="glass-input flex-1 text-sm"
            placeholder="Add skill..."
            value={newSkill}
            onChange={e => setNewSkill(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSkill() } }}
          />
          <button onClick={handleAddSkill} className="glass-button px-3 py-1 text-sm">Add</button>
        </div>
      </div>
    </div>
  )
}

export default memo(PresentationEntryCardInner)
