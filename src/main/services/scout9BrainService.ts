import { knowledgeRepository } from '../db/agents/repositories/knowledgeRepository'
import { patternRepository } from '../db/agents/repositories/patternRepository'
import { brainRepository } from '../db/agents/repositories/brainRepository'
import * as configRepository from '../db/agents/repositories/configRepository'
import { countKnowledgeTokens } from './tokenCountService'
import { createLogger } from './logger'

const log = createLogger('Scout9Brain')

interface BrainResult {
  systemPrompt: string
  snapshotId: string
}

interface TokenSection {
  items: { id: string; text: string; tokens: number }[]
  totalTokens: number
}

function buildSection(items: { id: string; text: string }[]): TokenSection {
  const counted = items.map(item => ({
    ...item,
    tokens: countKnowledgeTokens(item.text),
  }))
  return {
    items: counted,
    totalTokens: counted.reduce((sum, i) => sum + i.tokens, 0),
  }
}

function trimSection(section: TokenSection, maxTokens: number): TokenSection {
  const trimmed: typeof section.items = []
  let total = 0
  for (const item of section.items) {
    if (total + item.tokens > maxTokens) break
    trimmed.push(item)
    total += item.tokens
  }
  return { items: trimmed, totalTokens: total }
}

export function assembleBrain(
  jobId: string,
  scopeClient?: string,
  scopeStakeholder?: string
): BrainResult {
  const config = configRepository.getConfig()
  const ceiling = config.token_budget_ceiling

  const rules = knowledgeRepository.listRules().filter(r => r.is_active === 1)
  const glossary = knowledgeRepository.listGlossary().filter(g => g.is_active === 1)
  const allPatterns = patternRepository.listPatterns().filter(p => p.is_active === 1)
  const notes = knowledgeRepository.listNotes().filter(n => n.is_active === 1)

  const rulesSection = buildSection(
    rules.map(r => ({ id: r.id, text: `[${r.rule_name}] ${r.rule_text}` }))
  )
  const glossarySection = buildSection(
    glossary.map(g => ({ id: g.id, text: `${g.term}: ${g.definition}` }))
  )
  const patternsSection = buildSection(
    allPatterns.map(p => ({ id: p.id, text: p.pattern_text }))
  )
  const notesSection = buildSection(
    notes.map(n => ({ id: n.id, text: `[${n.note_title}] ${n.note_text}` }))
  )

  let totalTokens = rulesSection.totalTokens + glossarySection.totalTokens + patternsSection.totalTokens + notesSection.totalTokens
  let finalNotes = notesSection
  let finalPatterns = patternsSection
  let finalRules = rulesSection

  if (totalTokens > ceiling) {
    const available = ceiling - rulesSection.totalTokens - glossarySection.totalTokens - patternsSection.totalTokens
    finalNotes = trimSection(notesSection, Math.max(0, available))
    totalTokens = finalRules.totalTokens + glossarySection.totalTokens + finalPatterns.totalTokens + finalNotes.totalTokens
  }

  if (totalTokens > ceiling) {
    const available = ceiling - rulesSection.totalTokens - glossarySection.totalTokens - finalNotes.totalTokens
    finalPatterns = trimSection(patternsSection, Math.max(0, available))
    totalTokens = finalRules.totalTokens + glossarySection.totalTokens + finalPatterns.totalTokens + finalNotes.totalTokens
  }

  if (totalTokens > ceiling) {
    const available = ceiling - glossarySection.totalTokens - finalPatterns.totalTokens - finalNotes.totalTokens
    finalRules = trimSection(rulesSection, Math.max(0, available))
    totalTokens = finalRules.totalTokens + glossarySection.totalTokens + finalPatterns.totalTokens + finalNotes.totalTokens
  }

  const activePrompt = configRepository.getActivePromptVersion()
  const basePrompt = activePrompt?.prompt_text ?? getDefaultSystemPrompt()

  const sections: string[] = [basePrompt]

  if (finalRules.items.length > 0) {
    sections.push('\n[BUSINESS RULES]')
    finalRules.items.forEach(r => sections.push(r.text))
  }
  if (glossarySection.items.length > 0) {
    sections.push('\n[GLOSSARY]')
    glossarySection.items.forEach(g => sections.push(g.text))
  }
  if (finalPatterns.items.length > 0) {
    sections.push('\n[LEARNED PATTERNS]')
    finalPatterns.items.forEach(p => sections.push(p.text))
  }
  if (finalNotes.items.length > 0) {
    sections.push('\n[CONTEXT NOTES]')
    finalNotes.items.forEach(n => sections.push(n.text))
  }

  const systemPrompt = sections.join('\n')

  const snapshot = brainRepository.create({
    snapshot_markdown: systemPrompt,
    token_estimate: totalTokens,
    source_job_id: jobId,
  })

  log.info('Brain assembled', {
    jobId,
    snapshotId: snapshot.id,
    rulesCount: finalRules.items.length,
    glossaryCount: glossarySection.items.length,
    patternsCount: finalPatterns.items.length,
    notesCount: finalNotes.items.length,
    totalTokens,
    ceiling,
  })

  return { systemPrompt, snapshotId: snapshot.id }
}

export function getTokenBudgetBreakdown(): { rules: number; glossary: number; patterns: number; notes: number; total: number; ceiling: number } {
  const config = configRepository.getConfig()
  const rules = knowledgeRepository.listRules().filter(r => r.is_active === 1)
  const glossary = knowledgeRepository.listGlossary().filter(g => g.is_active === 1)
  const patterns = patternRepository.listPatterns().filter(p => p.is_active === 1)
  const notes = knowledgeRepository.listNotes().filter(n => n.is_active === 1)

  const rulesTokens = rules.reduce((s, r) => s + countKnowledgeTokens(r.rule_text), 0)
  const glossaryTokens = glossary.reduce((s, g) => s + countKnowledgeTokens(`${g.term}: ${g.definition}`), 0)
  const patternsTokens = patterns.reduce((s, p) => s + countKnowledgeTokens(p.pattern_text), 0)
  const notesTokens = notes.reduce((s, n) => s + countKnowledgeTokens(n.note_text), 0)

  return {
    rules: rulesTokens,
    glossary: glossaryTokens,
    patterns: patternsTokens,
    notes: notesTokens,
    total: rulesTokens + glossaryTokens + patternsTokens + notesTokens,
    ceiling: config.token_budget_ceiling,
  }
}

function getDefaultSystemPrompt(): string {
  return `You are Scout-9, an AI talent-matching agent for Unosquare's COE Operations team.

Your task is to analyze open positions and candidate pools, then produce a structured report recommending the best matches.

For each position, evaluate available candidates based on:
- Technical skill alignment with position requirements
- Seniority level match
- Geographic compatibility
- Rate/salary fit within position budget (see SALARY NORMALIZATION section below)
- Prior presentation history (avoid re-presenting rejected candidates)

[SALARY NORMALIZATION]
All candidate and employee salary data has been normalized to a common unit: USD per month (normalized_monthly_usd).
- Use normalized_monthly_usd for all salary comparisons across candidates and positions.
- To compare against hourly position rates, convert: hourly_rate × 160 = approximate monthly USD.
- To compare against annual rates, convert: annual_rate / 12 = monthly USD.
- currency_confidence levels:
  - "exact": salary was explicitly in USD or had a precise conversion.
  - "high": country-based currency inference with reliable exchange rate.
  - "medium": reasonable inference but some ambiguity in original data.
  - "low": best-guess inference — treat as approximate, flag to the user.
- When confidence is "low", note the uncertainty in your recommendation reasoning.
- Use the get_candidate_salary_info tool to retrieve detailed salary data for a specific candidate.
- Use the filter_candidates_by_salary_range tool to efficiently find candidates within a budget.
- Consider both the candidate's normalized salary AND the position's rate range when evaluating fit.
- For contractor-heavy countries (BOL, PRY), consider both FTE and contractor cost structures.

Output a JSON report with this structure:
{
  "summary": "Brief overall summary",
  "positions": [
    {
      "upstreamId": number,
      "account": "string",
      "jobTitle": "string",
      "recommendations": [
        {
          "candidateUpstreamId": number,
          "candidateSourceType": "candidates" | "employees",
          "candidateName": "string",
          "fitScore": 0-100,
          "reasoning": "string",
          "strengths": ["string"],
          "concerns": ["string"]
        }
      ]
    }
  ]
}`
}
