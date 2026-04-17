import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import type {
  PresentationStepKey, PresentationMode, SelectedPerson,
  PresentationEntry, BenchOpenPosition, ResumeFormatStatus,
} from '../types'
import { useStepWizard } from '../hooks/useStepWizard'
import { presentationService } from '../services/presentationService'
import { benchBurnService } from '../services/benchBurnService'
import { createRendererLogger } from '../../../shared/utils/rendererLogger'

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

function getDefaultAvailability(person: SelectedPerson): string {
  if (person.sourceType === 'employee') {
    return person.isBench ? 'Immediate' : ''
  }
  return '2 Weeks'
}

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
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [entries, setEntries] = useState<PresentationEntry[]>([])
  const [introText, setIntroText] = useState('')
  const [htmlContent, setHtmlContent] = useState('')
  const [reviewEntries, setReviewEntries] = useState<ResumeReviewEntry[]>([])
  const [transformTarget, setTransformTarget] = useState<{ person: SelectedPerson; resumeText: string } | null>(null)
  const [generatingProfiles, setGeneratingProfiles] = useState<Set<number>>(new Set())
  const [regeneratingIntro, setRegeneratingIntro] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showHistory, setShowHistory] = useState(false)

  const positionTitle = skipPosition ? manualTitle : (selectedPosition?.jobTitle ?? '')
  const accountName = skipPosition ? manualAccount : (selectedPosition?.account ?? '')
  const positionUpstreamId = skipPosition ? null : (selectedPosition?.upstreamId ?? null)
  const jobDescription = selectedPosition?.jobDescription ?? ''

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
                hasResume: false, resumeNoteId: null, resumeFilename: null,
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
        setError('Failed to load pre-selected people')
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

    if (!sessionId) {
      try {
        const result = await presentationService.createSession({
          mode,
          positionTitle,
          accountName,
          positionUpstreamId: positionUpstreamId ?? undefined,
          jobDescription: jobDescription || undefined,
        })
        setSessionId(result.id)

        const newEntries: PresentationEntry[] = []
        for (let i = 0; i < selectedPeople.length; i++) {
          const person = selectedPeople[i]
          const addResult = await presentationService.addEntry({
            sessionId: result.id,
            sourceType: person.sourceType,
            upstreamId: person.upstreamId,
            fullName: person.fullName,
            mainSkill: person.mainSkill,
            seniority: person.seniority,
            country: person.country,
            availability: getDefaultAvailability(person),
            sortOrder: i,
          })
          newEntries.push({
            id: addResult.id,
            sessionId: result.id,
            sourceType: person.sourceType,
            upstreamId: person.upstreamId,
            fullName: person.fullName,
            mainSkill: person.mainSkill,
            seniority: person.seniority,
            country: person.country,
            yearsOfExperience: '',
            availability: getDefaultAvailability(person),
            recommendedRate: '',
            techStack: [],
            professionalSummary: '',
            domainExperience: '',
            resumeFormatStatus: 'unknown',
            sortOrder: i,
          })
        }
        setEntries(newEntries)
      } catch (err) {
        log.error('Failed to create presentation session', err)
        setError('Failed to create presentation session')
        return
      }
    }

    navigateStep('review-resumes')
  }, [sessionId, selectedPeople, mode, positionTitle, accountName, positionUpstreamId, jobDescription, completeStep, navigateStep])

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

  const handleUpdateEntry = useCallback((id: number, field: string, value: unknown) => {
    setEntries(prev => prev.map(e => {
      if (e.id !== id) return e
      if (field === 'techStack') return { ...e, techStack: value as string[] }
      return { ...e, [field]: value }
    }))
    presentationService.updateEntry(id, { [field === 'techStack' ? 'techStack' : field]: value }).catch(() => {})
  }, [])

  const handleGenerateProfile = useCallback(async (entry: PresentationEntry) => {
    const review = reviewEntries.find(r =>
      r.person.upstreamId === entry.upstreamId && r.person.sourceType === entry.sourceType
    )
    const resumeText = review?.resumeText
    if (!resumeText) {
      try {
        const text = await benchBurnService.getResumeText(entry.sourceType, entry.upstreamId)
        if (!text) {
          setError(`No resume text available for ${entry.fullName}`)
          return
        }
        await doGenerateProfile(entry, text)
      } catch (err) {
        log.error('Failed to get resume text', { fullName: entry.fullName, error: err })
        setError(`Failed to get resume text for ${entry.fullName}`)
      }
      return
    }
    await doGenerateProfile(entry, resumeText)
  }, [reviewEntries, jobDescription, positionTitle])

  const doGenerateProfile = async (entry: PresentationEntry, resumeText: string) => {
    setGeneratingProfiles(prev => new Set([...prev, entry.id]))
    try {
      const result = await presentationService.generateCandidateProfile({
        resumeText,
        fullName: entry.fullName,
        mainSkill: entry.mainSkill,
        jobDescription: jobDescription || undefined,
        positionTitle: positionTitle || undefined,
      })
      setEntries(prev => prev.map(e => {
        if (e.id !== entry.id) return e
        return {
          ...e,
          professionalSummary: result.professionalSummary,
          techStack: result.techStack,
          domainExperience: result.domainExperience,
          yearsOfExperience: result.yearsOfExperience,
        }
      }))
      await presentationService.updateEntry(entry.id, {
        professionalSummary: result.professionalSummary,
        techStack: result.techStack,
        domainExperience: result.domainExperience,
        yearsOfExperience: result.yearsOfExperience,
      })
    } catch (err) {
      log.error('Failed to generate profile', { fullName: entry.fullName, error: err })
      setError(`Failed to generate profile for ${entry.fullName}`)
    } finally {
      setGeneratingProfiles(prev => { const s = new Set(prev); s.delete(entry.id); return s })
    }
  }

  const handleGenerateIntro = useCallback(async () => {
    setRegeneratingIntro(true)
    try {
      const result = await presentationService.generateIntro({
        candidateNames: entries.map(e => e.fullName),
        positionTitle: positionTitle || undefined,
        accountName: accountName || undefined,
        jobDescription: jobDescription || undefined,
        mainSkill: entries[0]?.mainSkill,
      })
      setIntroText(result.introText)
      if (sessionId) {
        await presentationService.updateSession(sessionId, { introText: result.introText })
      }
    } catch (err) {
      log.error('Failed to generate intro', err)
      setError('Failed to generate intro')
    } finally {
      setRegeneratingIntro(false)
    }
  }, [entries, positionTitle, accountName, jobDescription, sessionId])

  const handleGenerateHtml = useCallback(async () => {
    if (!sessionId) return
    try {
      const result = await presentationService.generateHtml({ sessionId, mode })
      setHtmlContent(result.html)
    } catch (err) {
      log.error('Failed to generate HTML', err)
      setError('Failed to generate HTML')
    }
  }, [sessionId, mode])

  const handleSave = useCallback(async () => {
    if (!sessionId) return
    setSaving(true)
    try {
      await presentationService.updateSession(sessionId, { status: 'completed', introText })
      completeStep('finalize')
    } catch (err) {
      log.error('Failed to save session', err)
      setError('Failed to save session')
    } finally {
      setSaving(false)
    }
  }, [sessionId, introText, completeStep])

  const handleNextFromGenerate = useCallback(() => {
    completeStep('generate')
    navigateStep('finalize')
  }, [completeStep, navigateStep])

  const handleLoadSession = useCallback(async (id: number) => {
    try {
      const session = await presentationService.getSession(id)
      if (!session) return
      setSessionId(session.id)
      setMode(session.mode)
      setIntroText(session.introText)
      setEntries(session.entries)
      setShowHistory(false)
      navigateStep('generate')
    } catch (err) {
      log.error('Failed to load session', err)
      setError('Failed to load session')
    }
  }, [navigateStep])

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

      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">×</button>
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

          <div className="glass-panel p-6">
            {currentStep === 'select-people' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-primary">Select Candidates & Employees</h2>
                <PeopleSelector selectedPeople={selectedPeople} onSelectionChange={setSelectedPeople} />
                <SelectedPeopleCart selectedPeople={selectedPeople} onRemove={handleRemovePerson} />
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
                  {entries.map(entry => (
                    <PresentationEntryCard
                      key={entry.id}
                      entry={entry}
                      onUpdate={handleUpdateEntry}
                      onGenerateProfile={handleGenerateProfile}
                      generating={generatingProfiles.has(entry.id)}
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
                  entries={entries}
                  introText={introText}
                  mode={mode}
                  positionTitle={positionTitle}
                  accountName={accountName}
                  positionId={positionUpstreamId}
                  onIntroChange={setIntroText}
                  onRegenerateIntro={handleGenerateIntro}
                  regenerating={regeneratingIntro}
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
                  entries={entries}
                  introText={introText}
                  mode={mode}
                  positionTitle={positionTitle}
                  accountName={accountName}
                  positionId={positionUpstreamId}
                  onIntroChange={setIntroText}
                  onRegenerateIntro={handleGenerateIntro}
                  regenerating={regeneratingIntro}
                />
                <FinalizeActions
                  htmlContent={htmlContent}
                  onSave={handleSave}
                  onGenerateHtml={handleGenerateHtml}
                  hasHtml={!!htmlContent}
                  saving={saving}
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
