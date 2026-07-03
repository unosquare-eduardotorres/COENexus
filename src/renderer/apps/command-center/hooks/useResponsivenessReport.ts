import { useState, useEffect, useMemo, useCallback } from 'react'
import { responsivenessService } from '../services/responsivenessService'
import { reportService } from '../services/reportService'
import type {
  ResponsivenessMentionItem,
  ResponsivenessLeadSummary,
  ResponsivenessDiscussionComment,
  ResponsivenessAiMentionVerdict,
  ResponsivenessAiAnalysisResult,
  PositionAttentionReport,
  PositionAttentionItem,
  PositionAttentionLeadGroup,
  PositionAttentionState,
  PositionAttentionProgress,
} from '../../../../shared/ipc-types'
import type { PositionDetailResult } from '../types'
import { buildAnnotatedThreads } from '../utils/threadBuilder'
import type { AnnotatedThread } from '../utils/threadBuilder'

// ── Types ──────────────────────────────────────────────────

export interface PositionGroup {
  positionUpstreamId: number
  account: string
  coe: string
  practice: string
  mainSkill: string
  aging: number
  mentions: ResponsivenessMentionItem[]
  unansweredCount: number
  newestWaitingDays: number
}

export function useResponsivenessReport() {
  // ── Position Attention Report State (on-demand generation) ──
  const [report, setReport] = useState<PositionAttentionReport | null>(null)
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState<PositionAttentionProgress>({
    phase: 'loading', completed: 0, total: 0,
  })
  const [error, setError] = useState<string | null>(null)

  // Filters (applied client-side after generation)
  const [search, setSearch] = useState('')
  const [leadFilter, setLeadFilter] = useState('all')
  const [coeFilter, setCoeFilter] = useState('all')
  const [stateFilter, setStateFilter] = useState<PositionAttentionState | 'all'>('all')

  // Expansion & discussion cache
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set())
  const [discussionCache, setDiscussionCache] = useState<Map<number, ResponsivenessDiscussionComment[]>>(new Map())
  const [loadingDiscussions, setLoadingDiscussions] = useState<Set<number>>(new Set())

  // Candidate detail cache (loaded on expand)
  const [candidateCache, setCandidateCache] = useState<Map<number, PositionDetailResult['candidates']>>(new Map())
  const [loadingCandidates, setLoadingCandidates] = useState<Set<number>>(new Set())

  // Listen for progress events from backend
  useEffect(() => {
    const cleanup = window.api.responsiveness.onGenerateProgress?.((p: PositionAttentionProgress) => {
      setProgress(p)
    })
    return () => { cleanup?.() }
  }, [])

  // Load persisted report on mount
  useEffect(() => {
    let cancelled = false
    responsivenessService.getLastReport().then(saved => {
      if (!cancelled && saved && !report) {
        setReport(saved)
      }
    }).catch(() => { /* no persisted report — show empty state */ })
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const generateReport = useCallback(async () => {
    if (generating) return
    setGenerating(true)
    setError(null)
    setReport(null)
    setExpandedGroups(new Set())
    setProgress({ phase: 'loading', completed: 0, total: 0 })
    try {
      const result = await responsivenessService.generateFullReport()
      setReport(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report')
    } finally {
      setGenerating(false)
    }
  }, [generating])

  // ── Filtered positions (client-side) ──
  const filteredPositions = useMemo((): PositionAttentionItem[] => {
    if (!report) return []
    let items = [...report.allPositions]

    // State filter
    if (stateFilter !== 'all') {
      items = items.filter(i => i.attentionState === stateFilter)
    }

    // Lead filter
    if (leadFilter !== 'all') {
      items = items.filter(i => i.ownerEmail.toLowerCase() === leadFilter.toLowerCase())
    }

    // COE filter
    if (coeFilter !== 'all') {
      items = items.filter(i => i.coe === coeFilter)
    }

    // Free-text search
    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter(i =>
        i.account.toLowerCase().includes(q) ||
        i.jobTitle.toLowerCase().includes(q) ||
        i.mainSkill.toLowerCase().includes(q) ||
        i.coe.toLowerCase().includes(q) ||
        i.stakeholder.toLowerCase().includes(q) ||
        i.ownerName.toLowerCase().includes(q) ||
        i.summary.toLowerCase().includes(q) ||
        i.ballWith.toLowerCase().includes(q) ||
        String(i.positionUpstreamId).includes(q)
      )
    }

    return items
  }, [report, search, leadFilter, coeFilter, stateFilter])

  // ── Re-group filtered positions by lead ──
  const filteredLeadGroups = useMemo((): PositionAttentionLeadGroup[] => {
    const groupMap = new Map<string, PositionAttentionLeadGroup>()
    for (const item of filteredPositions) {
      const key = item.ownerEmail.toLowerCase()
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          leadName: item.ownerName,
          leadEmail: item.ownerEmail,
          coePractice: item.coe,
          totalPositions: 0,
          needsAction: 0,
          waitingOnClient: 0,
          onTrack: 0,
          noActivity: 0,
          escalated: 0,
          positions: [],
        })
      }
      const group = groupMap.get(key)!
      group.totalPositions++
      if (item.attentionState === 'needs-coe-action') group.needsAction++
      else if (item.attentionState === 'waiting-on-client') group.waitingOnClient++
      else if (item.attentionState === 'on-track') group.onTrack++
      else if (item.attentionState === 'escalated') group.escalated++
      else group.noActivity++
      group.positions.push(item)
    }
    // Sort: most escalated+needsAction combined first
    return [...groupMap.values()].sort((a, b) => (b.needsAction + b.escalated) - (a.needsAction + a.escalated))
  }, [filteredPositions])

  // ── Filtered summary counts ──
  const filteredSummary = useMemo(() => ({
    total: filteredPositions.length,
    needsAction: filteredPositions.filter(i => i.attentionState === 'needs-coe-action').length,
    waitingOnClient: filteredPositions.filter(i => i.attentionState === 'waiting-on-client').length,
    onTrack: filteredPositions.filter(i => i.attentionState === 'on-track').length,
    noActivity: filteredPositions.filter(i => i.attentionState === 'no-activity').length,
    escalated: filteredPositions.filter(i => i.attentionState === 'escalated').length,
  }), [filteredPositions])

  // Expand + load discussions
  const expandAndLoad = useCallback(async (positionId: number) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(positionId)) { next.delete(positionId); return next }
      next.add(positionId)
      return next
    })

    if (!discussionCache.has(positionId)) {
      setLoadingDiscussions(prev => new Set(prev).add(positionId))
      try {
        const discussions = await responsivenessService.getPositionDiscussions(positionId)
        setDiscussionCache(prev => new Map(prev).set(positionId, discussions))
      } catch {
        // Fail silently
      } finally {
        setLoadingDiscussions(prev => {
          const next = new Set(prev)
          next.delete(positionId)
          return next
        })
      }
    }
  }, [discussionCache])

  const getThreadsForPosition = useCallback((positionId: number): AnnotatedThread[] | null => {
    const discussions = discussionCache.get(positionId)
    if (!discussions) return null
    // Build threads with empty mention items (no longer mention-based)
    return buildAnnotatedThreads(discussions, [])
  }, [discussionCache])

  // Load candidates for a position on expand
  const loadCandidates = useCallback(async (positionId: number) => {
    if (candidateCache.has(positionId)) return
    setLoadingCandidates(prev => new Set(prev).add(positionId))
    try {
      const detail = await reportService.getPositionDetail(positionId)
      if (detail) {
        setCandidateCache(prev => new Map(prev).set(positionId, detail.candidates))
      }
    } catch { /* fail silently */ }
    finally {
      setLoadingCandidates(prev => { const next = new Set(prev); next.delete(positionId); return next })
    }
  }, [candidateCache])

  // Toggle group expansion (without loading discussions)
  const toggleGroup = useCallback((positionId: number) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(positionId)) next.delete(positionId)
      else { next.add(positionId); loadCandidates(positionId) }
      return next
    })
  }, [loadCandidates])

  // Derive filter options from ALL positions (not filtered)
  const filterOptions = useMemo(() => {
    if (!report) return { leads: [] as { name: string; email: string }[], coes: [] as string[] }
    const leadMap = new Map<string, string>()
    const coeSet = new Set<string>()
    for (const p of report.allPositions) {
      leadMap.set(p.ownerEmail.toLowerCase(), p.ownerName)
      if (p.coe) coeSet.add(p.coe)
    }
    const leads = [...leadMap.entries()].map(([email, name]) => ({ name, email })).sort((a, b) => a.name.localeCompare(b.name))
    const coes = [...coeSet].sort()
    return { leads, coes }
  }, [report])

  return {
    // Report state
    report,
    generating,
    progress,
    error,
    generateReport,
    // Filtered data
    filteredPositions,
    filteredLeadGroups,
    filteredSummary,
    // Filters
    search,
    leadFilter,
    coeFilter,
    stateFilter,
    setSearch,
    setLeadFilter,
    setCoeFilter,
    setStateFilter,
    filterOptions,
    // Expansion
    expandedGroups,
    expandAndLoad,
    toggleGroup,
    loadingDiscussions,
    getThreadsForPosition,
    // Candidate details
    candidateCache,
    loadingCandidates,
  }
}
