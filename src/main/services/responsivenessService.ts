import { createLogger } from './logger'
import { syncRepository } from '../db/repositories/syncRepository'
import type { CoePracticeLeadRow, OpenPositionDiscussionRow, SyncedOpenPositionRow } from '../db/repositories/syncRepository'
import { matchRepository } from '../db/repositories/matchRepository'
import { llmRouter } from './llmRouter'
import { responsivenessAnalysisSchema, positionAttentionSchema } from './utils/aiResponseSchemas'
import { fillTemplate, RESPONSIVENESS_CONTEXT_ANALYSIS, POSITION_ATTENTION_ANALYSIS } from './promptTemplates'
import type { WebContents } from 'electron'
import type {
  PositionAttentionState,
  PositionAttentionItem,
  PositionAttentionLeadGroup,
  PositionAttentionReport,
  PositionAttentionProgress,
} from '../../shared/ipc-types'
import { IPC_CHANNELS } from '../../shared/ipc-channels'

const log = createLogger('ResponsivenessService')

const REPORT_METADATA_KEY = 'position_attention_report'

/** Unanswered mentions older than this are considered stale noise and excluded. */
const STALE_THRESHOLD_DAYS = 30

/** Auto-escalate 'waiting-on-client' positions stale beyond this many days. */
const STALE_CLIENT_WAIT_DAYS = 7

// ── Practice Lead → Technology Mapping ─────────────────────

const PRACTICE_LEAD_TECHNOLOGIES: Record<string, string[]> = {
  'luis.naranjo@unosquare.com':       ['angular', 'node.js', 'node', 'react', 'go', 'javascript', 'vue.js', 'vue', 'typescript', 'js'],
  'emmanuel.huitrado@unosquare.com':  ['java', 'python'],
  'jd.warren@unosquare.com':          ['ruby'],
  'braulio.hernandez@unosquare.com':  ['c#', '.net', 'dotnet'],
}
const FALLBACK_LEAD_EMAIL = 'eduardo.torres@unosquare.com'

function findOwnerForPosition(
  position: SyncedOpenPositionRow,
  leads: CoePracticeLeadRow[]
): CoePracticeLeadRow {
  const coe = position.coe.toLowerCase()
  const skill = position.main_skill.toLowerCase()

  for (const [email, techs] of Object.entries(PRACTICE_LEAD_TECHNOLOGIES)) {
    if (techs.some(t => coe.includes(t) || skill.includes(t))) {
      const lead = leads.find(l => l.email.toLowerCase() === email.toLowerCase())
      if (lead) return lead
    }
  }
  // Fallback to Eduardo Torres (Niche catch-all)
  return leads.find(l => l.email.toLowerCase() === FALLBACK_LEAD_EMAIL)
    ?? { id: 0, display_name: 'Eduardo Torres', email: FALLBACK_LEAD_EMAIL, coe: 'Niche', active: 1 }
}

/** Rule-based fallback classification when AI is unavailable or position has no discussions. */
function classifyByRules(position: SyncedOpenPositionRow): {
  attentionState: PositionAttentionState
  ballWith: string
  summary: string
  flagReason: string
} {
  // No discussions at all → No Activity
  if (!position.last_discussion_date) {
    return {
      attentionState: 'no-activity',
      ballWith: 'N/A',
      summary: 'No discussion activity on this position.',
      flagReason: 'No discussion thread exists for this position.',
    }
  }

  const daysSinceDiscussion = daysBetween(position.last_discussion_date)

  // No candidates + open 14+ days → Needs COE Action
  if (position.candidates_presented === 0 && position.aging >= 14) {
    return {
      attentionState: 'needs-coe-action',
      ballWith: 'COE Team',
      summary: `Position open ${position.aging} days with no candidates presented. Sourcing action needed.`,
      flagReason: `Open for ${position.aging} days with zero candidates presented. Sourcing pipeline requires immediate attention.`,
    }
  }

  // Stale discussions (7+ days) → could be waiting or needs action
  if (daysSinceDiscussion >= STALE_CLIENT_WAIT_DAYS) {
    return {
      attentionState: 'needs-coe-action',
      ballWith: 'COE Team',
      summary: `No discussion activity in ${daysSinceDiscussion} days. Follow-up needed.`,
      flagReason: `Last discussion activity was ${daysSinceDiscussion} days ago. Follow-up with commercial team or client success is recommended.`,
    }
  }

  return {
    attentionState: 'on-track',
    ballWith: 'COE Team',
    summary: 'Position has recent discussion activity and appears on track.',
    flagReason: '',
  }
}

// ── Types ──────────────────────────────────────────────────

export interface MentionItem {
  positionUpstreamId: number
  account: string
  coe: string
  practice: string
  mainSkill: string
  aging: number
  mentionCommentId: number
  mentionMessage: string
  mentionAuthor: string
  mentionAuthorName: string
  mentionDate: string
  taggedLeadName: string
  taggedLeadEmail: string
  waitingSince: string
  waitingDays: number
  responded: boolean
}

export interface LeadSummaryItem {
  name: string
  email: string
  totalMentions: number
  unanswered: number
  responseRate: number
}

export interface ResponsivenessReport {
  totalMentions: number
  unansweredMentions: number
  responseRate: number
  items: MentionItem[]
  leadSummary: LeadSummaryItem[]
}

// ── Helpers ────────────────────────────────────────────────

/** Extract display name from email prefix: "luis.naranjo@unosquare.com" → "luis naranjo" */
function emailToDisplayName(email: string): string {
  const prefix = email.split('@')[0] || email
  return prefix.replace(/[._-]/g, ' ').trim()
}

/** Find which tracked leads are @-mentioned in a message. */
function findLeadMentionsInMessage(
  message: string,
  leads: CoePracticeLeadRow[]
): CoePracticeLeadRow[] {
  // Parse all @[Display Name](email) mentions from the message
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g
  const mentionedEmails: string[] = []
  let match: RegExpExecArray | null
  while ((match = mentionRegex.exec(message)) !== null) {
    mentionedEmails.push(match[2].toLowerCase())
  }

  // Match mentioned emails against tracked leads
  return leads.filter(lead =>
    mentionedEmails.includes(lead.email.toLowerCase())
  )
}

/** Calculate days between two dates. */
function daysBetween(dateStr: string): number {
  const then = new Date(dateStr).getTime()
  const now = Date.now()
  return Math.max(0, Math.floor((now - then) / (1000 * 60 * 60 * 24)))
}

/** Check if a comment's author email matches a lead. */
function authorMatchesLead(authorEmail: string, lead: CoePracticeLeadRow): boolean {
  return authorEmail.toLowerCase() === lead.email.toLowerCase()
}

/**
 * Check if a message references the original asker.
 * Scenario 2: @[Name](email) — match asker's email in any mention
 * Scenario 3: Plain first name (≥3 chars)
 */
function messageReferencesAsker(
  message: string,
  askerEmail: string,
  askerDisplayName: string
): boolean {
  // Scenario 2: @[Name](email) — match asker's email in any mention
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g
  let match: RegExpExecArray | null
  while ((match = mentionRegex.exec(message)) !== null) {
    if (match[2].toLowerCase() === askerEmail.toLowerCase()) return true
  }

  // Scenario 3: First name only (minimum 3 chars to avoid false positives)
  const parts = askerDisplayName.toLowerCase().split(/\s+/).filter(Boolean)
  if (parts[0]?.length >= 3 && message.toLowerCase().includes(parts[0])) return true

  return false
}

// ── Core Detection ─────────────────────────────────────────

interface MentionRecord {
  lead: CoePracticeLeadRow
  comment: OpenPositionDiscussionRow
  askerEmail: string
  askerDisplayName: string
}

function detectMentionsForPosition(
  discussions: OpenPositionDiscussionRow[],
  leads: CoePracticeLeadRow[],
): { mentions: MentionRecord[]; responded: Set<string> } {
  const mentions: MentionRecord[] = []
  const responded = new Set<string>()  // key: `${commentId}-${leadEmail}`

  // Pass 1: Find all mentions of tracked leads
  for (const comment of discussions) {
    const mentionedLeads = findLeadMentionsInMessage(comment.message, leads)
    for (const lead of mentionedLeads) {
      // Don't count self-mentions
      if (!authorMatchesLead(comment.author, lead)) {
        mentions.push({
          lead,
          comment,
          askerEmail: comment.author,
          askerDisplayName: emailToDisplayName(comment.author),
        })
      }
    }
  }

  // Pass 2: Check responses for each mention
  for (const mention of mentions) {
    const key = `${mention.comment.comment_id}-${mention.lead.email.toLowerCase()}`

    // Scenario 1: Thread reply — lead posted a child comment
    const hasThreadReply = discussions.some(
      d =>
        d.parent_comment_id === mention.comment.comment_id &&
        authorMatchesLead(d.author, mention.lead)
    )
    if (hasThreadReply) {
      responded.add(key)
      continue
    }

    // Scenario 2+3: Flat @-reply or plain name mention
    // Lead posted any later comment mentioning the asker's name
    const hasFlatReply = discussions.some(d => {
      if (d.date <= mention.comment.date) return false
      if (!authorMatchesLead(d.author, mention.lead)) return false
      return messageReferencesAsker(d.message, mention.askerEmail, mention.askerDisplayName)
    })
    if (hasFlatReply) {
      responded.add(key)
    }
  }

  return { mentions, responded }
}

// ── Service ────────────────────────────────────────────────

export const responsivenessService = {
  getReport(): ResponsivenessReport {
    const leads = syncRepository.getCoePracticeLeads()
    if (leads.length === 0) {
      return { totalMentions: 0, unansweredMentions: 0, responseRate: 100, items: [], leadSummary: [] }
    }

    const positions = syncRepository.getActiveOpenPositions()
    const discussionMap = syncRepository.getAllActivePositionDiscussions()

    // Build position lookup for metadata
    const positionMap = new Map<number, SyncedOpenPositionRow>()
    for (const pos of positions) {
      positionMap.set(pos.upstream_id, pos)
    }

    // Per-lead counters
    const leadStats = new Map<string, { total: number; unanswered: number }>()
    for (const lead of leads) {
      leadStats.set(lead.email.toLowerCase(), { total: 0, unanswered: 0 })
    }

    const allItems: MentionItem[] = []
    let totalMentions = 0

    for (const [positionId, discussions] of discussionMap) {
      const position = positionMap.get(positionId)
      if (!position) continue

      const { mentions, responded } = detectMentionsForPosition(discussions, leads)

      for (const mention of mentions) {
        const key = `${mention.comment.comment_id}-${mention.lead.email.toLowerCase()}`
        const isResponded = responded.has(key)
        const mentionAgeDays = daysBetween(mention.comment.date)

        // Skip stale unanswered mentions (>30 days old)
        if (!isResponded && mentionAgeDays > STALE_THRESHOLD_DAYS) continue

        totalMentions++
        const stats = leadStats.get(mention.lead.email.toLowerCase())
        if (stats) {
          stats.total++
          if (!isResponded) stats.unanswered++
        }

        allItems.push({
          positionUpstreamId: positionId,
          account: position.account,
          coe: position.coe,
          practice: position.practice,
          mainSkill: position.main_skill,
          aging: position.aging,
          mentionCommentId: mention.comment.comment_id,
          mentionMessage: mention.comment.message,
          mentionAuthor: mention.askerEmail,
          mentionAuthorName: mention.askerDisplayName,
          mentionDate: mention.comment.date,
          taggedLeadName: mention.lead.display_name,
          taggedLeadEmail: mention.lead.email,
          waitingSince: mention.comment.date,
          waitingDays: daysBetween(mention.comment.date),
          responded: isResponded,
        })
      }
    }

    // Sort by waiting days ASC (most recent first)
    allItems.sort((a, b) => a.waitingDays - b.waitingDays)

    const leadSummary: LeadSummaryItem[] = leads.map(lead => {
      const stats = leadStats.get(lead.email.toLowerCase()) ?? { total: 0, unanswered: 0 }
      return {
        name: lead.display_name,
        email: lead.email,
        totalMentions: stats.total,
        unanswered: stats.unanswered,
        responseRate: stats.total > 0 ? Math.round(((stats.total - stats.unanswered) / stats.total) * 100) : 100,
      }
    })

    const unansweredCount = allItems.filter(i => !i.responded).length
    const responseRate = totalMentions > 0 ? Math.round(((totalMentions - unansweredCount) / totalMentions) * 100) : 100

    log.info('Responsiveness report generated', { totalMentions, unanswered: unansweredCount, responseRate })

    return {
      totalMentions,
      unansweredMentions: unansweredCount,
      responseRate,
      items: allItems,
      leadSummary,
    }
  },

  getLeads(): CoePracticeLeadRow[] {
    return syncRepository.getCoePracticeLeads()
  },

  addLead(name: string, email: string, coe: string = ''): CoePracticeLeadRow {
    return syncRepository.addCoePracticeLead({ display_name: name, email, coe })
  },

  removeLead(id: number): void {
    syncRepository.deactivateCoePracticeLead(id)
  },

  getPositionDiscussions(positionUpstreamId: number): Array<{
    commentId: number; author: string; date: string; message: string; parentCommentId: number | null
  }> {
    const rows = syncRepository.getDiscussionsByPositionId(positionUpstreamId)
    return rows.map(r => ({
      commentId: r.comment_id,
      author: r.author,
      date: r.date,
      message: r.message,
      parentCommentId: r.parent_comment_id,
    }))
  },

  async analyzeUnansweredMentions(
    positionUpstreamIds: number[]
  ): Promise<Array<{
    positionUpstreamId: number
    positionSummary: string
    verdicts: Array<{
      mentionCommentId: number
      taggedLeadEmail: string
      stillNeedsResponse: boolean
      confidence: number
      reasoning: string
    }>
  }>> {
    const concurrency = llmRouter.getConcurrencyLimit('responsivenessAnalysis')
    const leads = syncRepository.getCoePracticeLeads()
    if (leads.length === 0 || positionUpstreamIds.length === 0) return []

    const results: Array<{
      positionUpstreamId: number
      positionSummary: string
      verdicts: Array<{
        mentionCommentId: number
        taggedLeadEmail: string
        stillNeedsResponse: boolean
        confidence: number
        reasoning: string
      }>
    }> = []

    // Process positions with concurrency limit
    const queue = [...positionUpstreamIds]
    const active: Promise<void>[] = []

    while (queue.length > 0 || active.length > 0) {
      while (active.length < concurrency && queue.length > 0) {
        const posId = queue.shift()!
        const promise = analyzeOnePosition(posId, leads)
          .then(result => { if (result) results.push(result) })
          .catch(err => log.error(`AI analysis failed for position ${posId}`, err instanceof Error ? err : new Error(String(err))))
          .then(() => { active.splice(active.indexOf(promise), 1) })
        active.push(promise)
      }
      if (active.length > 0) await Promise.race(active)
    }

    log.info('AI analysis complete', { positionsAnalyzed: positionUpstreamIds.length, resultsReturned: results.length })
    return results
  },

  // ── Position Attention Report ────────────────────────────

  async generateFullReport(sender: WebContents): Promise<PositionAttentionReport> {
    const concurrency = llmRouter.getConcurrencyLimit('responsivenessReport')

    // Phase 1: Loading
    const emitProgress = (p: PositionAttentionProgress) => {
      try { sender.send(IPC_CHANNELS.RESPONSIVENESS_GENERATE_PROGRESS, p) } catch { /* window may close */ }
    }
    emitProgress({ phase: 'loading', completed: 0, total: 0 })

    const positions = syncRepository.getActiveOpenPositions()
    const discussionMap = syncRepository.getAllActivePositionDiscussions()
    const leads = syncRepository.getCoePracticeLeads()

    log.info('Position Attention: loaded data', { positions: positions.length, discussions: discussionMap.size, leads: leads.length })

    // Separate positions: with discussions (need AI) vs without (rule-based)
    const withDiscussions: SyncedOpenPositionRow[] = []
    const withoutDiscussions: SyncedOpenPositionRow[] = []
    for (const pos of positions) {
      if (discussionMap.has(pos.upstream_id) && (discussionMap.get(pos.upstream_id)?.length ?? 0) > 0) {
        withDiscussions.push(pos)
      } else {
        withoutDiscussions.push(pos)
      }
    }

    const totalToAnalyze = withDiscussions.length
    emitProgress({ phase: 'analyzing', completed: 0, total: totalToAnalyze })

    // Phase 2: AI classification for positions WITH discussions
    const allItems: PositionAttentionItem[] = []
    let analyzedCount = 0

    // Process with concurrency
    const queue = [...withDiscussions]
    const active: Promise<void>[] = []

    while (queue.length > 0 || active.length > 0) {
      while (active.length < concurrency && queue.length > 0) {
        const pos = queue.shift()!
        const discussions = discussionMap.get(pos.upstream_id) ?? []
        const owner = findOwnerForPosition(pos, leads)

        // Count mentions for this position
        const { mentions, responded } = detectMentionsForPosition(discussions, leads)
        const mentionCount = mentions.length
        const unansweredMentionCount = mentions.filter(m => {
          const key = `${m.comment.comment_id}-${m.lead.email.toLowerCase()}`
          return !responded.has(key)
        }).length

        const promise = analyzeOnePositionAttention(pos, discussions, owner)
          .then(result => {
            allItems.push({
              positionUpstreamId: pos.upstream_id,
              account: pos.account,
              coe: pos.coe,
              practice: pos.practice,
              mainSkill: pos.main_skill,
              jobTitle: pos.job_title,
              aging: pos.aging,
              candidatesPresented: pos.candidates_presented,
              lastDiscussionDate: pos.last_discussion_date,
              stakeholder: pos.stakeholder,
              seniorities: pos.seniorities,
              attentionState: result.attentionState,
              ballWith: result.ballWith,
              summary: result.summary,
              confidence: result.confidence,
              ownerEmail: owner.email,
              ownerName: owner.display_name,
              mentionCount,
              unansweredMentionCount,
              escalated: false,
              flagReason: '',
            })
          })
          .catch(err => {
            // Fallback to rule-based classification
            log.error(`AI classification failed for position ${pos.upstream_id}`, err instanceof Error ? err : new Error(String(err)))
            const fallback = classifyByRules(pos)
            allItems.push({
              positionUpstreamId: pos.upstream_id,
              account: pos.account,
              coe: pos.coe,
              practice: pos.practice,
              mainSkill: pos.main_skill,
              jobTitle: pos.job_title,
              aging: pos.aging,
              candidatesPresented: pos.candidates_presented,
              lastDiscussionDate: pos.last_discussion_date,
              stakeholder: pos.stakeholder,
              seniorities: pos.seniorities,
              attentionState: fallback.attentionState,
              ballWith: fallback.ballWith,
              summary: fallback.summary,
              confidence: -1,
              ownerEmail: owner.email,
              ownerName: owner.display_name,
              mentionCount,
              unansweredMentionCount,
              escalated: false,
              flagReason: fallback.flagReason,
            })
          })
          .then(() => {
            analyzedCount++
            emitProgress({
              phase: 'analyzing',
              completed: analyzedCount,
              total: totalToAnalyze,
              currentPosition: `#${pos.upstream_id} · ${pos.account}`,
            })
            active.splice(active.indexOf(promise), 1)
          })
        active.push(promise)
      }
      if (active.length > 0) await Promise.race(active)
    }

    // Phase 3: Rule-based classification for positions WITHOUT discussions
    emitProgress({ phase: 'classifying', completed: analyzedCount, total: totalToAnalyze })

    for (const pos of withoutDiscussions) {
      const owner = findOwnerForPosition(pos, leads)
      const fallback = classifyByRules(pos)
      allItems.push({
        positionUpstreamId: pos.upstream_id,
        account: pos.account,
        coe: pos.coe,
        practice: pos.practice,
        mainSkill: pos.main_skill,
        jobTitle: pos.job_title,
        aging: pos.aging,
        candidatesPresented: pos.candidates_presented,
        lastDiscussionDate: pos.last_discussion_date,
        stakeholder: pos.stakeholder,
        seniorities: pos.seniorities,
        attentionState: fallback.attentionState,
        ballWith: fallback.ballWith,
        summary: fallback.summary,
        confidence: -1,
        ownerEmail: owner.email,
        ownerName: owner.display_name,
        mentionCount: 0,
        unansweredMentionCount: 0,
        escalated: false,
        flagReason: fallback.flagReason,
      })
    }

    // Auto-escalation: waiting-on-client + stale > 7 days → needs-coe-action
    for (const item of allItems) {
      if (
        item.attentionState === 'waiting-on-client' &&
        item.lastDiscussionDate &&
        daysBetween(item.lastDiscussionDate) >= STALE_CLIENT_WAIT_DAYS
      ) {
        item.attentionState = 'escalated'
        item.escalated = true
        item.flagReason = `Originally classified as "Waiting on Client," but no discussion activity for ${daysBetween(item.lastDiscussionDate!)} days. Positions stale beyond 7 days are automatically escalated for COE follow-up.`
      }
    }

    // Group by COE lead owner
    const leadGroupMap = new Map<string, PositionAttentionLeadGroup>()
    for (const item of allItems) {
      const key = item.ownerEmail.toLowerCase()
      if (!leadGroupMap.has(key)) {
        leadGroupMap.set(key, {
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
      const group = leadGroupMap.get(key)!
      group.totalPositions++
      if (item.attentionState === 'needs-coe-action') group.needsAction++
      else if (item.attentionState === 'waiting-on-client') group.waitingOnClient++
      else if (item.attentionState === 'on-track') group.onTrack++
      else if (item.attentionState === 'escalated') group.escalated++
      else group.noActivity++
      group.positions.push(item)
    }

    // Sort groups: most escalated+needsAction combined first
    const leadGroups = [...leadGroupMap.values()].sort((a, b) =>
      (b.needsAction + b.escalated) - (a.needsAction + a.escalated)
    )
    // Sort positions within each group: on-track first, then escalated/needs-action last
    const stateOrder: Record<PositionAttentionState, number> = {
      'on-track': 0,
      'waiting-on-client': 1,
      'needs-coe-action': 2,
      'escalated': 3,
      'no-activity': 4,
    }
    for (const group of leadGroups) {
      group.positions.sort((a, b) => {
        const stateDiff = stateOrder[a.attentionState] - stateOrder[b.attentionState]
        return stateDiff !== 0 ? stateDiff : b.aging - a.aging
      })
    }

    const report: PositionAttentionReport = {
      generatedAt: new Date().toISOString(),
      totalPositions: allItems.length,
      needsAction: allItems.filter(i => i.attentionState === 'needs-coe-action').length,
      waitingOnClient: allItems.filter(i => i.attentionState === 'waiting-on-client').length,
      onTrack: allItems.filter(i => i.attentionState === 'on-track').length,
      noActivity: allItems.filter(i => i.attentionState === 'no-activity').length,
      escalated: allItems.filter(i => i.attentionState === 'escalated').length,
      leadGroups,
      allPositions: allItems,
    }

    emitProgress({ phase: 'done', completed: totalToAnalyze, total: totalToAnalyze })
    log.info('Position Attention report generated', {
      total: report.totalPositions,
      needsAction: report.needsAction,
      waitingOnClient: report.waitingOnClient,
      onTrack: report.onTrack,
      noActivity: report.noActivity,
      escalated: report.escalated,
    })

    // Persist to DB for reload across sessions
    try {
      syncRepository.saveSyncMetadata(REPORT_METADATA_KEY, JSON.stringify(report))
      log.info('Position Attention report persisted to DB')
    } catch (err) {
      log.error('Failed to persist Position Attention report', err instanceof Error ? err : new Error(String(err)))
    }

    return report
  },

  getLastReport(): PositionAttentionReport | null {
    const raw = syncRepository.getSyncMetadata(REPORT_METADATA_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as PositionAttentionReport
    } catch {
      log.error('Failed to parse persisted Position Attention report')
      return null
    }
  },
}

// ── AI Analysis Helper ────────────────────────────────────

async function analyzeOnePosition(
  positionUpstreamId: number,
  leads: CoePracticeLeadRow[],
): Promise<{
  positionUpstreamId: number
  positionSummary: string
  verdicts: Array<{
    mentionCommentId: number
    taggedLeadEmail: string
    stillNeedsResponse: boolean
    confidence: number
    reasoning: string
  }>
} | null> {
  const position = syncRepository.getOpenPositionByUpstreamId(positionUpstreamId)
  if (!position) return null

  const discussions = syncRepository.getDiscussionsByPositionId(positionUpstreamId)
  const candidates = matchRepository.getOpenPositionCandidates(positionUpstreamId)

  // Detect unanswered mentions for this position
  const { mentions, responded } = detectMentionsForPosition(discussions, leads)
  const unanswered = mentions.filter(m => {
    const key = `${m.comment.comment_id}-${m.lead.email.toLowerCase()}`
    if (responded.has(key)) return false
    return daysBetween(m.comment.date) <= STALE_THRESHOLD_DAYS
  })
  if (unanswered.length === 0) return null

  // Build context strings
  const candidatePipeline = candidates.slice(0, 20).map(c =>
    `- ${c.candidate_name} (${c.main_skill}): ${c.candidate_status}` +
    (c.rejection_comments ? ` — "${c.rejection_comments}"` : '')
  ).join('\n') || '(No candidates presented yet)'

  const discussionThread = [...discussions]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-30)
    .map(d => `[${d.date}] ${emailToDisplayName(d.author)}: ${d.message}`)
    .join('\n\n')

  const mentionsToEvaluate = unanswered.map(m =>
    `- Comment #${m.comment.comment_id} by ${m.askerDisplayName} on ${m.comment.date}: ` +
    `Tagged @${m.lead.display_name} (${m.lead.email})\n  Message: "${m.comment.message}"`
  ).join('\n\n')

  const prompt = fillTemplate(RESPONSIVENESS_CONTEXT_ANALYSIS, {
    account: position.account,
    jobTitle: position.job_title,
    mainSkill: position.main_skill,
    positionStatus: position.position_status,
    aging: String(position.aging),
    candidatesPresented: String(position.candidates_presented),
    candidatePipeline,
    discussionThread,
    mentionsToEvaluate,
  })

  const { text: response } = await llmRouter.chatAsync('responsivenessAnalysis', prompt, 2048, 0.2)

  // Handle both formats: new object { positionSummary, verdicts } or legacy bare array
  const cleaned = response.replace(/```json\n?|\n?```/g, '').trim()
  let rawJson: unknown
  try { rawJson = JSON.parse(cleaned) } catch { rawJson = null }

  // If AI returned a bare array, wrap it into the expected object shape
  if (Array.isArray(rawJson)) {
    rawJson = { positionSummary: '', verdicts: rawJson }
  }

  const parsed = responsivenessAnalysisSchema.parse(rawJson)

  return {
    positionUpstreamId,
    verdicts: parsed.verdicts,
    positionSummary: parsed.positionSummary,
  }
}

// ── Position Attention AI Helper ─────────────────────────

async function analyzeOnePositionAttention(
  position: SyncedOpenPositionRow,
  discussions: OpenPositionDiscussionRow[],
  owner: CoePracticeLeadRow,
): Promise<{
  attentionState: PositionAttentionState
  ballWith: string
  summary: string
  confidence: number
}> {
  const candidates = matchRepository.getOpenPositionCandidates(position.upstream_id)

  // Build context strings
  const candidatePipeline = candidates.slice(0, 20).map(c =>
    `- ${c.candidate_name} (${c.main_skill}): ${c.candidate_status}` +
    (c.rejection_comments ? ` — "${c.rejection_comments}"` : '')
  ).join('\n') || '(No candidates presented yet)'

  const discussionThread = [...discussions]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-40)
    .map(d => `[${d.date}] ${emailToDisplayName(d.author)}: ${d.message}`)
    .join('\n\n')

  const prompt = fillTemplate(POSITION_ATTENTION_ANALYSIS, {
    positionId: String(position.upstream_id),
    account: position.account,
    jobTitle: position.job_title,
    mainSkill: position.main_skill,
    coe: position.coe,
    stakeholder: position.stakeholder,
    positionStatus: position.position_status,
    aging: String(position.aging),
    candidatesPresented: String(position.candidates_presented),
    seniorities: position.seniorities,
    candidatePipeline,
    discussionThread,
    ownerName: owner.display_name,
    ownerEmail: owner.email,
  })

  const { text: response } = await llmRouter.chatAsync('responsivenessReport', prompt, 1024, 0.2)

  const cleaned = response.replace(/```json\n?|\n?```/g, '').trim()
  let rawJson: unknown
  try { rawJson = JSON.parse(cleaned) } catch { rawJson = null }

  const parsed = positionAttentionSchema.parse(rawJson)

  // Map AI enum to our state type
  const stateMap: Record<string, PositionAttentionState> = {
    NEEDS_COE_ACTION: 'needs-coe-action',
    WAITING_ON_CLIENT: 'waiting-on-client',
    ON_TRACK: 'on-track',
  }

  return {
    attentionState: stateMap[parsed.attentionState] ?? 'on-track',
    ballWith: parsed.ballWith,
    summary: parsed.summary,
    confidence: parsed.confidence,
  }
}
