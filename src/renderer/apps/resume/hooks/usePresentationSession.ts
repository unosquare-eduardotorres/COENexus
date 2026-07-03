/**
 * Manages presentation session state: session creation, entry management,
 * profile generation, intro generation, and HTML export.
 *
 * Extracted from PresentationPage to reduce its cyclomatic complexity.
 */

import { useState, useCallback } from 'react'
import type { PresentationMode, SelectedPerson, PresentationEntry } from '../types'
import { presentationService } from '../services/presentationService'
import { benchBurnService } from '../services/benchBurnService'
import type { ResumeReviewEntry } from '../components/presentation/ResumeReviewList'
import { createRendererLogger } from '../../../shared/utils/rendererLogger'

const log = createRendererLogger('usePresentationSession')

function getDefaultAvailability(person: SelectedPerson): string {
  if (person.sourceType === 'employee') {
    return person.isBench ? 'Immediate' : ''
  }
  return '2 Weeks'
}

interface UsePresentationSessionOptions {
  selectedPeople: SelectedPerson[]
  reviewEntries: ResumeReviewEntry[]
  mode: PresentationMode
  positionTitle: string
  accountName: string
  positionUpstreamId: number | null
  jobDescription: string
}

export function usePresentationSession(options: UsePresentationSessionOptions) {
  const { selectedPeople, reviewEntries, mode, positionTitle, accountName, positionUpstreamId, jobDescription } = options

  const [sessionId, setSessionId] = useState<number | null>(null)
  const [entries, setEntries] = useState<PresentationEntry[]>([])
  const [introText, setIntroText] = useState('')
  const [htmlContent, setHtmlContent] = useState('')
  const [generatingProfiles, setGeneratingProfiles] = useState<Set<number>>(new Set())
  const [regeneratingIntro, setRegeneratingIntro] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const createSession = useCallback(async (): Promise<boolean> => {
    if (sessionId) return true
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
      return true
    } catch (err) {
      log.error('Failed to create presentation session', err)
      setError('Failed to create presentation session')
      return false
    }
  }, [sessionId, selectedPeople, mode, positionTitle, accountName, positionUpstreamId, jobDescription])

  const updateEntry = useCallback((id: number, field: string, value: unknown) => {
    setEntries(prev => prev.map(e => {
      if (e.id !== id) return e
      if (field === 'techStack') return { ...e, techStack: value as string[] }
      return { ...e, [field]: value }
    }))
    presentationService.updateEntry(id, { [field === 'techStack' ? 'techStack' : field]: value }).catch(() => {})
  }, [])

  const generateProfile = useCallback(async (entry: PresentationEntry) => {
    const review = reviewEntries.find(r =>
      r.person.upstreamId === entry.upstreamId && r.person.sourceType === entry.sourceType
    )
    let resumeText = review?.resumeText
    if (!resumeText) {
      try {
        resumeText = await benchBurnService.getResumeText(entry.sourceType, entry.upstreamId)
        if (!resumeText) {
          setError(`No resume text available for ${entry.fullName}`)
          return
        }
      } catch (err) {
        log.error('Failed to get resume text', { fullName: entry.fullName, error: err })
        setError(`Failed to get resume text for ${entry.fullName}`)
        return
      }
    }

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
  }, [reviewEntries, jobDescription, positionTitle])

  const generateIntro = useCallback(async () => {
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

  const generateHtml = useCallback(async () => {
    if (!sessionId) return
    try {
      const result = await presentationService.generateHtml({ sessionId, mode })
      setHtmlContent(result.html)
    } catch (err) {
      log.error('Failed to generate HTML', err)
      setError('Failed to generate HTML')
    }
  }, [sessionId, mode])

  const save = useCallback(async (onComplete: () => void) => {
    if (!sessionId) return
    setSaving(true)
    setSaved(false)
    try {
      await presentationService.updateSession(sessionId, { status: 'completed', introText })
      onComplete()
      setSaved(true)
    } catch (err) {
      log.error('Failed to save session', err)
      setError('Failed to save session')
    } finally {
      setSaving(false)
    }
  }, [sessionId, introText])

  const loadSession = useCallback(async (id: number, onLoaded: () => void) => {
    try {
      const session = await presentationService.getSession(id)
      if (!session) return
      setSessionId(session.id)
      setIntroText(session.introText)
      setEntries(session.entries)
      onLoaded()
    } catch (err) {
      log.error('Failed to load session', err)
      setError('Failed to load session')
    }
  }, [])

  return {
    sessionId,
    entries,
    introText,
    setIntroText,
    htmlContent,
    generatingProfiles,
    regeneratingIntro,
    saving,
    saved,
    error,
    setError,
    createSession,
    updateEntry,
    generateProfile,
    generateIntro,
    generateHtml,
    save,
    loadSession,
  }
}
