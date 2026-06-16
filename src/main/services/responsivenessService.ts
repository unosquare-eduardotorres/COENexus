import { createLogger } from './logger'
import { syncRepository } from '../db/repositories/syncRepository'
import type { CoePracticeLeadRow, OpenPositionDiscussionRow, SyncedOpenPositionRow } from '../db/repositories/syncRepository'

const log = createLogger('ResponsivenessService')

// ── Types ──────────────────────────────────────────────────

export interface UnansweredMention {
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
  items: UnansweredMention[]
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
  const found: CoePracticeLeadRow[] = []
  for (const lead of leads) {
    // Build a regex for @FirstName LastName (case-insensitive, word boundary)
    const escaped = lead.display_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = new RegExp(`@${escaped}\\b`, 'i')
    if (pattern.test(message)) {
      found.push(lead)
    }
  }
  return found
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
 * Check if a message references the original asker by name.
 * Handles: @FirstName LastName, plain "FirstName LastName", or just "FirstName" (≥3 chars).
 */
function messageReferencesAsker(message: string, askerDisplayName: string): boolean {
  const parts = askerDisplayName.toLowerCase().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return false
  const msgLower = message.toLowerCase()

  // Scenario 2: @FirstName LastName
  if (msgLower.includes(`@${askerDisplayName.toLowerCase()}`)) return true

  // Plain "FirstName LastName"
  if (parts.length > 1 && msgLower.includes(askerDisplayName.toLowerCase())) return true

  // Scenario 3: First name only (minimum 3 chars to avoid false positives)
  if (parts[0].length >= 3 && msgLower.includes(parts[0])) return true

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
      return messageReferencesAsker(d.message, mention.askerDisplayName)
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

    const unansweredItems: UnansweredMention[] = []
    let totalMentions = 0

    for (const [positionId, discussions] of discussionMap) {
      const position = positionMap.get(positionId)
      if (!position) continue

      const { mentions, responded } = detectMentionsForPosition(discussions, leads)

      for (const mention of mentions) {
        totalMentions++
        const key = `${mention.comment.comment_id}-${mention.lead.email.toLowerCase()}`
        const stats = leadStats.get(mention.lead.email.toLowerCase())
        if (stats) stats.total++

        if (!responded.has(key)) {
          if (stats) stats.unanswered++
          unansweredItems.push({
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
          })
        }
      }
    }

    // Sort by waiting days DESC (longest wait first)
    unansweredItems.sort((a, b) => b.waitingDays - a.waitingDays)

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

    const unansweredCount = unansweredItems.length
    const responseRate = totalMentions > 0 ? Math.round(((totalMentions - unansweredCount) / totalMentions) * 100) : 100

    log.info('Responsiveness report generated', { totalMentions, unanswered: unansweredCount, responseRate })

    return {
      totalMentions,
      unansweredMentions: unansweredCount,
      responseRate,
      items: unansweredItems,
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
}
