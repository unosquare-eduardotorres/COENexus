import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import type {
  PresentationStepKey, PresentationMode, SelectedPerson,
  BenchOpenPosition, ResumeFormatStatus,
} from '../types'
import { useStepWizard } from '../hooks/useStepWizard'
import { benchBurnService } from '../services/benchBurnService'
import { createRendererLogger } from '../../../shared/utils/rendererLogger'
import { usePresentationSession } from '../hooks/usePresentationSession'

const log = createRendererLogger('PresentationPage')
import PeopleSelector from '../components/presentation/PeopleSelector'
import SelectedPeopleCart from '../components/presentation/SelectedPeopleCart'
import PositionPicker from '../components/presentation/PositionPicker'
import PresentationModeToggle from '../components/presentation/PresentationModeToggle'
import ResumeReviewList from '../components/presentation/ResumeReviewList'
import type { ResumeReviewEntry } from '../components/presentation/ResumeReviewList'
import ResumeTransformModal from '../components/presentation/ResumeTransformModal'
import PresentationEntryCard from '../components/presentation/PresentationEntryCard'
import PresentationPreview from '../components/presentation/PresentationPreview'
import FinalizeActions from '../components/presentation/FinalizeActions'
import PresentationHistory from '../components/presentation/PresentationHistory'

const STEPS: { key: PresentationStepKey; label: string }[] = [
  { key: 'select-people', label: 'Select People' },
  { key: 'position-context', label: 'Position & Context' },
  { key: 'review-resumes', label: 'Review Resumes' },
  { key: 'generate', label: 'Generate' },
  { key: 'finalize', label: 'Finalize' },
]

export default function PresentationPage() {
  const [searchParams] = useSearchParams()
  const { currentStep, navigateStep, completeStep, completedSteps } = useStepWizard<PresentationStepKey>(
    'select-people',
    { historyKey: 'presentStep' }
  )

  const [selectedPeople, setSelectedPeople] = useState<SelectedPerson[]>([])
  const [mode, setMode] = useState<PresentationMode>('combined')
  const [selectedPosition, setSelectedPosition] = useState<BenchOpenPosition | null>(null)
  const [skipPosition, setSkipPosition] = useState(false)
  const [manualTitle, setManualTitle] = useState('')
  const [manualAccount, setManualAccount] = useState('')
  const [reviewEntries, setReviewEntries] = useState<ResumeReviewEntry[]>([])
  const [transformTarget, setTransformTarget] = useState<{ person: SelectedPerson; resumeText: string } | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [manualJobDescription, setManualJobDescription] = useState('')

  const positionTitle = skipPosition ? manualTitle : (selectedPosition?.jobTitle ?? '')
  const accountName = skipPosition ? manualAccount : (selectedPosition?.account ?? '')
  const positionUpstreamId = skipPosition ? null : (selectedPosition?.upstreamId ?? null)
  const jobDescription = skipPosition ? manualJobDescription : (selectedPosition?.jobDescription ?? '')

  const session = usePresentationSession({
    selectedPeople, reviewEntries, mode,
    positionTitle, accountName, positionUpstreamId, jobDescription,
  })

  useEffect(() => {
    const candidateIds = searchParams.get('candidates')?.split(',').map(Number).filter(Boolean) ?? []
    const employeeIds = searchParams.get('employees')?.split(',').map(Number).filter(Boolean) ?? []
    const posId = searchParams.get('positionId') ? Number(searchParams.get('positionId')) : null

    if (candidateIds.length === 0 && employeeIds.length === 0) return

    const loadPreselected = async () => {
      try {
        const preselected: SelectedPerson[] = []
        if (candidateIds.length > 0) {
          const allCandidates = await benchBurnService.getAllCandidates()
          for (const c of allCandidates) {
            if (candidateIds.includes(c.upstreamId)) {
              preselected.push({
                sourceType: 'candidate', upstreamId: c.upstreamId, fullName: c.name,
                mainSkill: c.mainSkill, seniority: c.seniority, country: c.country,
                hasResume: c.hasResume, resumeNoteId: null, resumeFilename: null,
                candidateStatus: c.candidateStatus,
              })
            }
          }
        }
        if (employeeIds.length > 0) {
          const allEmployees = await benchBurnService.getAllEmployees()
          for (const e of allEmployees) {
            if (employeeIds.includes(e.upstreamId)) {
              preselected.push({
                sourceType: 'employee', upstreamId: e.upstreamId, fullName: e.name,
                mainSkill: e.mainSkill, seniority: e.seniority, country: e.country,
                hasResume: e.hasResume ?? false, resumeNoteId: null, resumeFilename: null,
                isBench: e.isBench,
              })
            }
          }
        }
        if (preselected.length > 0) setSelectedPeople(preselected)

        if (posId) {
          const positions = await benchBurnService.getOpenPositions()
          const pos = positions.find(p => p.upstreamId === posId)
          if (pos) setSelectedPosition(pos)
        }
      } catch (err) {
        log.error('Failed to load pre-selected people', err)
        session.setError('Failed to load pre-selected people')
      }
    }
    loadPreselected()
  }, [])

  useEffect(() => {
    setReviewEntries(selectedPeople.map(p => ({
      person: p,
      formatStatus: 'unknown' as ResumeFormatStatus,
      checking: false,
      resumeText: null,
    })))
  }, [selectedPeople])

  const handleRemovePerson = useCallback((upstreamId: number, sourceType: 'candidate' | 'employee') => {
    setSelectedPeople(prev => prev.filter(p => !(p.upstreamId === upstreamId && p.sourceType === sourceType)))
  }, [])

  const handlePositionChange = useCallback((pos: BenchOpenPosition | null) => {
    setSelectedPosition(pos)
  }, [])

  const handleManualChange = useCallback((field: 'title' | 'account', value: string) => {
    if (field === 'title') setManualTitle(value)
    else setManualAccount(value)
  }, [])

  const handleNextFromPeople = useCallback(() => {
    if (selectedPeople.length === 0) return
    completeStep('select-people')
    navigateStep('position-context')
  }, [selectedPeople, completeStep, navigateStep])

  const handleNextFromPosition = useCallback(async () => {
    completeStep('position-context')
    const ok = await session.createSession()
    if (!ok) return
    navigateStep('review-resumes')
  }, [session.createSession, completeStep, navigateStep])

  const handleNextFromReview = useCallback(() => {
    completeStep('review-resumes')
    navigateStep('generate')
  }, [completeStep, navigateStep])

  const handleTransformComplete = useCallback((transformedText: string) => {
    if (!transformTarget) return
    const idx = reviewEntries.findIndex(e =>
      e.person.upstreamId === transformTarget.person.upstreamId &&
      e.person.sourceType === transformTarget.person.sourceType
    )
    if (idx >= 0) {
      const updated = [...reviewEntries]
      updated[idx] = { ...updated[idx], formatStatus: 'transformed', resumeText: transformedText }
      setReviewEntries(updated)
    }
    setTransformTarget(null)
  }, [transformTarget, reviewEntries])



  const handleNextFromGenerate = useCallback(() => {
    completeStep('generate')
    navigateStep('finalize')
  }, [completeStep, navigateStep])

  const handleLoadSession = useCallback(async (id: number) => {
    await session.loadSession(id, () => {
      setShowHistory(false)
      navigateStep('generate')
    })
  }, [session.loadSession, navigateStep])

  const currentStepIndex = STEPS.findIndex(s => s.key === currentStep)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Candidate Presentation</h1>
          <p className="text-sm text-muted mt-1">Build and export professional candidate presentations</p>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="glass-button px-4 py-2 text-sm"
        >
          {showHistory ? 'New Presentation' : 'Past Presentations'}
        </button>
      </div>

      {session.error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm flex items-center justify-between">
          {session.error}
          <button onClick={() => session.setError('')} className="text-red-500 hover:text-red-700">×</button>
        </div>
      )}

      {showHistory ? (
        <PresentationHistory onSelectSession={handleLoadSession} />
      ) : (
        <>
          <div className="flex items-center gap-1">
            {STEPS.map((step, idx) => (
              <div key={step.key} className="flex items-center">
                <button
                  onClick={() => {
                    if (idx <= currentStepIndex || completedSteps.has(step.key)) {
                      navigateStep(step.key)
                    }
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    currentStep === step.key
                      ? 'bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 font-medium'
                      : completedSteps.has(step.key)
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-muted'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    currentStep === step.key
                      ? 'bg-accent-500 text-white'
                      : completedSteps.has(step.key)
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 dark:bg-dark-muted text-gray-500'
                  }`}>
                    {completedSteps.has(step.key) ? '✓' : idx + 1}
                  </span>
                  {step.label}
                </button>
                {idx < STEPS.length - 1 && (
                  <div className="w-8 h-px bg-gray-200 dark:bg-dark-border mx-1" />
                )}
              </div>
            ))}
          </div>

          {currentStep !== 'select-people' && selectedPeople.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 rounded-lg bg-white/50 dark:bg-dark-card/50 border border-gray-200 dark:border-dark-border">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider">People</span>
                {selectedPeople.slice(0, 3).map(p => (
                  <span
                    key={`ctx-${p.sourceType}:${p.upstreamId}`}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                      ${p.sourceType === 'candidate'
                        ? 'bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'}`}
                  >
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${p.sourceType === 'candidate' ? 'bg-accent-500' : 'bg-emerald-500'}`} />
                    {p.fullName}
                  </span>
                ))}
                {selectedPeople.length > 3 && (
                  <span className="text-xs text-muted">+{selectedPeople.length - 3} more</span>
                )}
                <button onClick={() => navigateStep('select-people')} className="text-xs text-accent-500 hover:underline ml-1">Edit</button>
              </div>

              {currentStep !== 'position-context' && (selectedPosition || skipPosition) && (
                <>
                  <div className="w-px h-4 bg-gray-300 dark:bg-dark-border" />
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted uppercase tracking-wider">Position</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                      {positionTitle || 'Manual Entry'}
                      {accountName && ` · ${accountName}`}
                    </span>
                    <button onClick={() => navigateStep('position-context')} className="text-xs text-accent-500 hover:underline ml-1">Edit</button>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="glass-panel p-6">
            {currentStep === 'select-people' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-primary">Select Candidates & Employees</h2>
                <SelectedPeopleCart selectedPeople={selectedPeople} onRemove={handleRemovePerson} />
                <PeopleSelector selectedPeople={selectedPeople} onSelectionChange={setSelectedPeople} />
                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleNextFromPeople}
                    disabled={selectedPeople.length === 0}
                    className="bg-accent-600 hover:bg-accent-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    Next: Position & Context →
                  </button>
                </div>
              </div>
            )}

            {currentStep === 'position-context' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-primary">Position & Context</h2>
                <div>
                  <h3 className="text-sm font-medium text-secondary mb-3">Open Position</h3>
                  <PositionPicker
                    selectedPositionId={selectedPosition?.upstreamId ?? null}
                    onPositionChange={handlePositionChange}
                    manualTitle={manualTitle}
                    manualAccount={manualAccount}
                    onManualChange={handleManualChange}
                    skipPosition={skipPosition}
                    onSkipChange={setSkipPosition}
                    manualJobDescription={manualJobDescription}
                    onManualJobDescriptionChange={setManualJobDescription}
                  />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-secondary mb-3">Presentation Mode</h3>
                  <PresentationModeToggle mode={mode} onModeChange={setMode} />
                </div>
                <div className="flex justify-between pt-4">
                  <button onClick={() => navigateStep('select-people')} className="glass-button px-6 py-2.5 text-sm">
                    ← Back
                  </button>
                  <button
                    onClick={handleNextFromPosition}
                    className="bg-accent-600 hover:bg-accent-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    Next: Review Resumes →
                  </button>
                </div>
              </div>
            )}

            {currentStep === 'review-resumes' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-primary">Review Resumes & Build Profiles</h2>
                <ResumeReviewList
                  people={selectedPeople}
                  reviewEntries={reviewEntries}
                  onUpdateEntries={setReviewEntries}
                  onTransformRequest={(person, resumeText) => setTransformTarget({ person, resumeText })}
                  jobDescription={jobDescription}
                />

                <div className="minimal-divider" />
                <h3 className="text-base font-semibold text-primary">Candidate Information</h3>
                <div className="space-y-4">
                  {session.entries.map(entry => (
                    <PresentationEntryCard
                      key={entry.id}
                      entry={entry}
                      onUpdate={session.updateEntry}
                      onGenerateProfile={session.generateProfile}
                      generating={session.generatingProfiles.has(entry.id)}
                    />
                  ))}
                </div>

                <div className="flex justify-between pt-4">
                  <button onClick={() => navigateStep('position-context')} className="glass-button px-6 py-2.5 text-sm">
                    ← Back
                  </button>
                  <button
                    onClick={handleNextFromReview}
                    className="bg-accent-600 hover:bg-accent-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    Next: Preview →
                  </button>
                </div>
              </div>
            )}

            {currentStep === 'generate' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-primary">Preview Presentation</h2>
                <PresentationPreview
                  entries={session.entries}
                  introText={session.introText}
                  mode={mode}
                  positionTitle={positionTitle}
                  accountName={accountName}
                  positionId={positionUpstreamId}
                  onIntroChange={session.setIntroText}
                  onRegenerateIntro={session.generateIntro}
                  regenerating={session.regeneratingIntro}
                />
                <div className="flex justify-between pt-4">
                  <button onClick={() => navigateStep('review-resumes')} className="glass-button px-6 py-2.5 text-sm">
                    ← Back
                  </button>
                  <button
                    onClick={handleNextFromGenerate}
                    className="bg-accent-600 hover:bg-accent-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    Next: Finalize →
                  </button>
                </div>
              </div>
            )}

            {currentStep === 'finalize' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-primary">Finalize & Export</h2>
                <PresentationPreview
                  entries={session.entries}
                  introText={session.introText}
                  mode={mode}
                  positionTitle={positionTitle}
                  accountName={accountName}
                  positionId={positionUpstreamId}
                  onIntroChange={session.setIntroText}
                  onRegenerateIntro={session.generateIntro}
                  regenerating={session.regeneratingIntro}
                />
                <FinalizeActions
                  htmlContent={session.htmlContent}
                  onSave={() => session.save(() => completeStep('finalize'))}
                  onGenerateHtml={session.generateHtml}
                  hasHtml={!!session.htmlContent}
                  saving={session.saving}
                  saved={session.saved}
                />
                <div className="flex justify-start pt-4">
                  <button onClick={() => navigateStep('generate')} className="glass-button px-6 py-2.5 text-sm">
                    ← Back
                  </button>
                </div>
              </div>
            )}
          </div>

          {transformTarget && (
            <ResumeTransformModal
              person={transformTarget.person}
              resumeText={transformTarget.resumeText}
              jobDescription={jobDescription}
              onComplete={handleTransformComplete}
              onClose={() => setTransformTarget(null)}
            />
          )}
        </>
      )}
    </div>
  )
}
