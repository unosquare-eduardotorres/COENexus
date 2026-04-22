import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { createScout9Tools, ToolCallTracker } from './scout9Tools'
import { createLogger } from './logger'

const log = createLogger('Scout9McpServer')

function toTextResult(text: string) {
  return {
    content: [{ type: 'text' as const, text }],
  }
}

export function createScout9McpServer(tracker: ToolCallTracker, toolTimeoutMs: number): McpServer {
  const tools = createScout9Tools(tracker, toolTimeoutMs)
  const toolMap = new Map(tools.map(t => [t.name, t]))

  const server = new McpServer({
    name: 'scout9',
    version: '1.0.0',
  })

  server.registerTool(
    'get_resume_text',
    {
      description: 'Get full resume text for a candidate by source type and upstream ID',
      inputSchema: z.object({
        sourceType: z.string(),
        upstreamId: z.number(),
      }),
    },
    async (args) => {
      log.info('Tool called: get_resume_text', { sourceType: args.sourceType, upstreamId: args.upstreamId })
      const result = await toolMap.get('get_resume_text')!.execute(args)
      return toTextResult(result)
    }
  )

  server.registerTool(
    'get_position_discussions',
    {
      description: 'Get discussion thread for an open position by upstream ID',
      inputSchema: z.object({
        positionUpstreamId: z.number(),
      }),
    },
    async (args) => {
      log.info('Tool called: get_position_discussions', { positionUpstreamId: args.positionUpstreamId })
      const result = await toolMap.get('get_position_discussions')!.execute(args)
      return toTextResult(result)
    }
  )

  server.registerTool(
    'get_candidate_history',
    {
      description: 'Get other positions a candidate has been presented to',
      inputSchema: z.object({
        candidateId: z.number(),
      }),
    },
    async (args) => {
      log.info('Tool called: get_candidate_history', { candidateId: args.candidateId })
      const result = await toolMap.get('get_candidate_history')!.execute(args)
      return toTextResult(result)
    }
  )

  server.registerTool(
    'get_position_detail',
    {
      description: 'Get full details for an open position by upstream ID',
      inputSchema: z.object({
        positionUpstreamId: z.number(),
      }),
    },
    async (args) => {
      log.info('Tool called: get_position_detail', { positionUpstreamId: args.positionUpstreamId })
      const result = await toolMap.get('get_position_detail')!.execute(args)
      return toTextResult(result)
    }
  )

  server.registerTool(
    'get_candidate_salary_info',
    {
      description: 'Get normalized salary data for a candidate or employee by upstream ID and source type',
      inputSchema: z.object({
        sourceType: z.enum(['candidates', 'employees']),
        upstreamId: z.number(),
      }),
    },
    async (args) => {
      log.info('Tool called: get_candidate_salary_info', { sourceType: args.sourceType, upstreamId: args.upstreamId })
      const result = await toolMap.get('get_candidate_salary_info')!.execute(args)
      return toTextResult(result)
    }
  )

  server.registerTool(
    'filter_candidates_by_salary_range',
    {
      description: 'Find candidates/employees whose normalized_monthly_usd falls within a given range. Optionally filter by country or seniority.',
      inputSchema: z.object({
        minMonthlyUsd: z.number().optional(),
        maxMonthlyUsd: z.number().optional(),
        country: z.string().optional(),
        seniority: z.string().optional(),
        sourceType: z.enum(['candidates', 'employees']).optional(),
      }),
    },
    async (args) => {
      log.info('Tool called: filter_candidates_by_salary_range', { minMonthlyUsd: args.minMonthlyUsd, maxMonthlyUsd: args.maxMonthlyUsd })
      const result = await toolMap.get('filter_candidates_by_salary_range')!.execute(args)
      return toTextResult(result)
    }
  )

  server.registerTool(
    'compare_employment_costs',
    {
      description: 'Compare FTE vs contractor cost for a candidate in a specific country',
      inputSchema: z.object({
        normalizedMonthlyUsd: z.number(),
        country: z.string(),
        candidateName: z.string(),
      }),
    },
    async (args) => {
      log.info('Tool called: compare_employment_costs', { country: args.country })
      const result = await toolMap.get('compare_employment_costs')!.execute(args)
      return toTextResult(result)
    }
  )

  server.registerTool(
    'get_country_salary_matrix',
    {
      description: 'Get a country-by-seniority feasibility matrix for a position',
      inputSchema: z.object({
        positionUpstreamId: z.number(),
      }),
    },
    async (args) => {
      log.info('Tool called: get_country_salary_matrix', { positionUpstreamId: args.positionUpstreamId })
      const result = await toolMap.get('get_country_salary_matrix')!.execute(args)
      return toTextResult(result)
    }
  )

  server.registerTool(
    'evaluate_salary_feasibility',
    {
      description: 'Evaluate salary feasibility for candidates against a position budget',
      inputSchema: z.object({
        positionUpstreamId: z.number(),
        candidates: z.array(z.object({
          upstreamId: z.number(),
          fullName: z.string(),
          sourceType: z.enum(['candidates', 'employees']),
          country: z.string(),
          seniority: z.string(),
          normalizedMonthlyUsd: z.number().nullable(),
          currencyConfidence: z.string().nullable(),
        })),
      }),
    },
    async (args) => {
      log.info('Tool called: evaluate_salary_feasibility', { positionUpstreamId: args.positionUpstreamId, candidateCount: args.candidates.length })
      const result = await toolMap.get('evaluate_salary_feasibility')!.execute(args)
      return toTextResult(result)
    }
  )

  server.registerTool(
    'get_stakeholder_profile',
    {
      description: 'Get the inferred stakeholder profile for a client/stakeholder',
      inputSchema: z.object({
        account: z.string(),
        stakeholder: z.string().optional(),
      }),
    },
    async (args) => {
      log.info('Tool called: get_stakeholder_profile', { account: args.account, stakeholder: args.stakeholder })
      const result = await toolMap.get('get_stakeholder_profile')!.execute(args)
      return toTextResult(result)
    }
  )

  server.registerTool(
    'get_client_rule_overrides',
    {
      description: 'Get client-specific rule overrides',
      inputSchema: z.object({
        clientId: z.string(),
      }),
    },
    async (args) => {
      log.info('Tool called: get_client_rule_overrides', { clientId: args.clientId })
      const result = await toolMap.get('get_client_rule_overrides')!.execute(args)
      return toTextResult(result)
    }
  )

  server.registerTool(
    'get_knowledge_notes',
    {
      description: 'Get context notes for a specific client or stakeholder',
      inputSchema: z.object({
        client: z.string().optional(),
        stakeholder: z.string().optional(),
      }),
    },
    async (args) => {
      log.info('Tool called: get_knowledge_notes', { client: args.client, stakeholder: args.stakeholder })
      const result = await toolMap.get('get_knowledge_notes')!.execute(args)
      return toTextResult(result)
    }
  )

  return server
}
