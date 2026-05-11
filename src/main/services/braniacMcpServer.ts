import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { patternRepository } from '../db/agents/repositories/patternRepository'
import { stakeholderProfileRepository } from '../db/agents/repositories/stakeholderProfileRepository'
import { getDatabase } from '../db/connection'
import { createLogger } from './logger'

const log = createLogger('BraniacMcpServer')

function toTextResult(text: string) {
  return {
    content: [{ type: 'text' as const, text }],
  }
}

export function createBraniacMcpServer(): McpServer {
  const server = new McpServer({
    name: 'braniac',
    version: '1.0.0',
  })

  server.registerTool(
    'list_patterns',
    {
      description: 'List learned patterns. Optionally filter by account, stakeholder, or approval status.',
      inputSchema: z.object({
        account: z.string().optional(),
        stakeholder: z.string().optional(),
        approval_status: z.enum(['auto_applied', 'pending_review', 'approved', 'rejected']).optional(),
      }),
    },
    async (args) => {
      log.info('Tool called: list_patterns', args)
      let patterns = args.account
        ? patternRepository.listPatternsByAccount(args.account)
        : patternRepository.listPatternsBySourceAgent('braniac')

      if (args.stakeholder) {
        patterns = patterns.filter(p => p.stakeholder === args.stakeholder)
      }
      if (args.approval_status) {
        patterns = patterns.filter(p => p.approval_status === args.approval_status)
      }

      const result = patterns.map(p => ({
        id: p.id,
        name: p.pattern_name,
        text: p.pattern_text,
        confidence: p.confidence_score,
        status: p.approval_status,
        account: p.account,
        stakeholder: p.stakeholder,
        dataPoints: p.data_points_count,
        active: p.is_active === 1,
      }))

      return toTextResult(JSON.stringify(result, null, 2))
    }
  )

  server.registerTool(
    'get_stakeholder_profile',
    {
      description: 'Get the full profile for a specific stakeholder at a specific account',
      inputSchema: z.object({
        stakeholder: z.string(),
        account: z.string(),
      }),
    },
    async (args) => {
      log.info('Tool called: get_stakeholder_profile', args)
      const profile = stakeholderProfileRepository.getByStakeholderAndAccount(args.stakeholder, args.account)
      if (!profile) {
        return toTextResult(`No profile found for stakeholder "${args.stakeholder}" at account "${args.account}"`)
      }
      return toTextResult(JSON.stringify(profile, null, 2))
    }
  )

  server.registerTool(
    'list_stakeholder_profiles',
    {
      description: 'List all stakeholder profiles, optionally filtered by account',
      inputSchema: z.object({
        account: z.string().optional(),
      }),
    },
    async (args) => {
      log.info('Tool called: list_stakeholder_profiles', args)
      const profiles = args.account
        ? stakeholderProfileRepository.listByAccount(args.account)
        : stakeholderProfileRepository.listAll()

      const result = profiles.map(p => ({
        stakeholder: p.stakeholder_name,
        account: p.account,
        rateFloor: p.observed_rate_floor,
        rateCeiling: p.observed_rate_ceiling,
        avgAcceptedRate: p.avg_accepted_rate,
        acceptedCountries: p.accepted_countries,
        rejectedCountries: p.rejected_countries,
        seniorityFlexibility: p.seniority_flexibility === 1,
        postedSeniorities: p.posted_seniorities,
        acceptedSeniorities: p.accepted_seniorities,
        avgDecisionDays: p.avg_time_to_decision_days,
        rejectionReasons: p.top_rejection_reasons,
        acceptanceSignals: p.top_acceptance_signals,
        preferenceSummary: p.preference_summary,
        confidence: p.confidence_score,
        dataPoints: p.data_points_count,
      }))

      return toTextResult(JSON.stringify(result, null, 2))
    }
  )

  server.registerTool(
    'get_account_summary',
    {
      description: 'Get position, candidate, and stakeholder counts for an account',
      inputSchema: z.object({
        account: z.string(),
      }),
    },
    async (args) => {
      log.info('Tool called: get_account_summary', args)
      const nexusDb = getDatabase()

      const positionCount = nexusDb.prepare(
        'SELECT COUNT(*) as count FROM synced_open_positions WHERE account = ?'
      ).get(args.account) as { count: number }

      const stakeholders = nexusDb.prepare(
        "SELECT DISTINCT stakeholder FROM synced_open_positions WHERE account = ? AND stakeholder != ''"
      ).all(args.account) as { stakeholder: string }[]

      const candidateCount = nexusDb.prepare(`
        SELECT COUNT(opc.id) as count
        FROM open_position_candidates opc
        JOIN synced_open_positions sop ON sop.id = opc.open_position_id
        WHERE sop.account = ?
      `).get(args.account) as { count: number }

      const profiles = stakeholderProfileRepository.listByAccount(args.account)
      const patterns = patternRepository.listPatternsByAccount(args.account)

      return toTextResult(JSON.stringify({
        account: args.account,
        positions: positionCount.count,
        candidates: candidateCount.count,
        stakeholders: stakeholders.map(s => s.stakeholder),
        profilesGenerated: profiles.length,
        patternsLearned: patterns.length,
        patternsByStatus: {
          auto_applied: patterns.filter(p => p.approval_status === 'auto_applied').length,
          pending_review: patterns.filter(p => p.approval_status === 'pending_review').length,
          approved: patterns.filter(p => p.approval_status === 'approved').length,
          rejected: patterns.filter(p => p.approval_status === 'rejected').length,
        },
      }, null, 2))
    }
  )

  server.registerTool(
    'search_patterns',
    {
      description: 'Search across pattern names and text using a keyword',
      inputSchema: z.object({
        query: z.string(),
        account: z.string().optional(),
      }),
    },
    async (args) => {
      log.info('Tool called: search_patterns', args)
      const allPatterns = args.account
        ? patternRepository.listPatternsByAccount(args.account)
        : patternRepository.listPatternsBySourceAgent('braniac')

      const q = args.query.toLowerCase()
      const matches = allPatterns.filter(p =>
        p.pattern_name.toLowerCase().includes(q) || p.pattern_text.toLowerCase().includes(q)
      )

      return toTextResult(JSON.stringify(matches.map(p => ({
        id: p.id,
        name: p.pattern_name,
        text: p.pattern_text,
        confidence: p.confidence_score,
        status: p.approval_status,
        account: p.account,
        stakeholder: p.stakeholder,
      })), null, 2))
    }
  )

  return server
}
