import { useState } from 'react'
import type { SelectedPerson, ResumeFormatStatus } from '../../types'
import { benchBurnService } from '../../services/benchBurnService'
import { presentationService } from '../../services/presentationService'

interface ResumeReviewEntry {
  person: SelectedPerson
  formatStatus: ResumeFormatStatus
  checking: boolean
  resumeText: string | null
}

interface ResumeReviewListProps {
  people: SelectedPerson[]
  reviewEntries: ResumeReviewEntry[]
  onUpdateEntries: (entries: ResumeReviewEntry[]) => void
  onTransformRequest: (person: SelectedPerson, resumeText: string) => void
  jobDescription?: string
}

function StatusBadge({ status }: { status: ResumeFormatStatus }) {
  const styles: Record<ResumeFormatStatus, string> = {
    unknown: 'bg-gray-100 text-gray-600 dark:bg-dark-muted dark:text-gray-400',
    formatted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    needs_formatting: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    transformed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  }
  const labels: Record<ResumeFormatStatus, string> = {
    unknown: 'Not Checked',
    formatted: 'Formatted',
    needs_formatting: 'Needs Formatting',
    transformed: 'Transformed',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}

export default function ResumeReviewList({
  people, reviewEntries, onUpdateEntries, onTransformRequest, jobDescription
}: ResumeReviewListProps) {
  const [error, setError] = useState('')

  const handleCheckFormat = async (person: SelectedPerson, index: number) => {
    const updated = [...reviewEntries]
    updated[index] = { ...updated[index], checking: true }
    onUpdateEntries(updated)
    setError('')

    try {
      const text = await benchBurnService.getResumeText(person.sourceType, person.upstreamId)
      if (!text) {
        updated[index] = { ...updated[index], checking: false, formatStatus: 'needs_formatting', resumeText: null }
        onUpdateEntries(updated)
        return
      }

      const result = await presentationService.checkResumeFormat({ resumeText: text })
      updated[index] = {
        ...updated[index],
        checking: false,
        formatStatus: result.isFormatted ? 'formatted' : 'needs_formatting',
        resumeText: text,
      }
      onUpdateEntries(updated)
    } catch (err) {
      setError(`Failed to check format for ${person.fullName}`)
      updated[index] = { ...updated[index], checking: false }
      onUpdateEntries(updated)
    }
  }

  const handleCheckAll = async () => {
    for (let i = 0; i < reviewEntries.length; i++) {
      if (reviewEntries[i].formatStatus === 'unknown' && people[i].hasResume) {
        await handleCheckFormat(people[i], i)
      }
    }
  }

  const hasUnchecked = reviewEntries.some((e, i) => e.formatStatus === 'unknown' && people[i].hasResume)

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {hasUnchecked && (
        <div className="flex justify-end">
          <button onClick={handleCheckAll} className="glass-button text-sm px-4 py-2">
            Check All Formats
          </button>
        </div>
      )}

      <div className="space-y-2">
        {people.map((person, idx) => {
          const entry = reviewEntries[idx]
          return (
            <div key={`${person.sourceType}:${person.upstreamId}`} className="glass-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`inline-block w-2 h-2 rounded-full ${person.sourceType === 'candidate' ? 'bg-accent-500' : 'bg-emerald-500'}`} />
                  <div>
                    <span className="font-medium text-primary">{person.fullName}</span>
                    <span className="text-muted text-sm ml-2">{person.seniority} {person.mainSkill}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={entry?.formatStatus ?? 'unknown'} />
                  {entry?.checking ? (
                    <div className="w-4 h-4 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <div className="flex gap-2">
                      {(!entry || entry.formatStatus === 'unknown') && person.hasResume && (
                        <button
                          onClick={() => handleCheckFormat(person, idx)}
                          className="text-xs text-accent-600 dark:text-accent-400 hover:underline"
                        >
                          Check Format
                        </button>
                      )}
                      {entry?.formatStatus === 'needs_formatting' && entry.resumeText && (
                        <button
                          onClick={() => onTransformRequest(person, entry.resumeText!)}
                          className="text-xs text-accent-600 dark:text-accent-400 hover:underline"
                        >
                          Transform Resume
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {!person.hasResume && (
                <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  ⚠ No resume on file. This person will be included without resume analysis.
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export type { ResumeReviewEntry }
