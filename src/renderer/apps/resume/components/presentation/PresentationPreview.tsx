import type { PresentationEntry, PresentationMode } from '../../types'

interface PresentationPreviewProps {
  entries: PresentationEntry[]
  introText: string
  mode: PresentationMode
  positionTitle: string
  accountName: string
  positionId: number | null
  onIntroChange: (text: string) => void
  onRegenerateIntro: () => void
  regenerating: boolean
}

function buildEmailTitle(mode: PresentationMode, entries: PresentationEntry[], positionTitle: string, accountName: string, positionId: number | null): string {
  if (mode === 'individual' && entries.length === 1) {
    const e = entries[0]
    const parts = ['Unosquare Candidate Presentation', e.fullName, `${e.seniority} ${e.mainSkill}`]
    if (accountName) parts.push(accountName)
    if (positionId) parts.push(String(positionId))
    return parts.join(' - ')
  }
  const parts = ['Unosquare Candidate Presentation']
  if (positionTitle) parts.push(positionTitle)
  if (accountName) parts.push(accountName)
  if (positionId) parts.push(String(positionId))
  return parts.join(' - ')
}

export default function PresentationPreview({
  entries, introText, mode, positionTitle, accountName, positionId,
  onIntroChange, onRegenerateIntro, regenerating,
}: PresentationPreviewProps) {
  const title = buildEmailTitle(mode, entries, positionTitle, accountName, positionId)

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <div className="border-b border-gray-200 dark:border-dark-border pb-4 mb-4">
          <h2 className="text-lg font-bold text-primary">{title}</h2>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-secondary">Introduction</label>
            <button
              onClick={onRegenerateIntro}
              disabled={regenerating}
              className="text-xs text-accent-600 dark:text-accent-400 hover:underline flex items-center gap-1"
            >
              {regenerating && <div className="w-3 h-3 border border-accent-500 border-t-transparent rounded-full animate-spin" />}
              Regenerate Intro
            </button>
          </div>
          <textarea
            className="glass-input w-full text-sm resize-none"
            rows={4}
            value={introText}
            onChange={e => onIntroChange(e.target.value)}
            placeholder="Hi [Client],&#10;&#10;Please find the candidate information below..."
          />
        </div>

        <div className="space-y-6">
          {entries.map(entry => (
            <div key={entry.id} className="border-t border-gray-200 dark:border-dark-border pt-4">
              <h3 className="text-base font-semibold text-primary mb-2">{entry.fullName}</h3>
              {entry.professionalSummary && (
                <p className="text-sm italic text-secondary mb-3">{entry.professionalSummary}</p>
              )}

              <table className="text-sm w-full mb-3">
                <tbody>
                  <tr>
                    <td className="py-1 pr-4 font-medium text-secondary w-44">Technology</td>
                    <td className="py-1 text-primary">{entry.mainSkill}</td>
                  </tr>
                  <tr>
                    <td className="py-1 pr-4 font-medium text-secondary">Years of Experience</td>
                    <td className="py-1 text-primary">{entry.yearsOfExperience || '—'}</td>
                  </tr>
                  <tr>
                    <td className="py-1 pr-4 font-medium text-secondary">Location</td>
                    <td className="py-1 text-primary">{entry.country}</td>
                  </tr>
                  <tr>
                    <td className="py-1 pr-4 font-medium text-secondary">Availability</td>
                    <td className="py-1 text-primary">{entry.availability || '—'}</td>
                  </tr>
                  <tr>
                    <td className="py-1 pr-4 font-medium text-secondary">Recommended Rate</td>
                    <td className="py-1 text-primary">{entry.recommendedRate ? `$ ${entry.recommendedRate} USD/hr` : '—'}</td>
                  </tr>
                  {entry.domainExperience && (
                    <tr>
                      <td className="py-1 pr-4 font-medium text-secondary">Domains</td>
                      <td className="py-1 text-primary">{entry.domainExperience}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {entry.techStack.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-secondary">Technical Stack:</span>
                  <ul className="list-disc list-inside text-sm text-primary mt-1 columns-2">
                    {entry.techStack.map((skill, idx) => (
                      <li key={idx}>{skill}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
