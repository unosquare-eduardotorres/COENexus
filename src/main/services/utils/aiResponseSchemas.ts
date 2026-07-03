import { z } from 'zod'

export const haikuTriageSchema = z.object({
  relevant: z.boolean().default(false),
  score: z.number().min(0).max(100).default(0),
  reason: z.string().default(''),
})

export type HaikuTriageResult = z.infer<typeof haikuTriageSchema>

export const haikuBatchTriageSchema = z.array(
  z.object({
    candidateIndex: z.number(),
    relevant: z.boolean().default(false),
    score: z.number().min(0).max(100).default(0),
    reason: z.string().default(''),
  })
)

export type HaikuBatchTriageResult = z.infer<typeof haikuBatchTriageSchema>

export const opusAnalysisSchema = z.object({
  matchScore: z.number().default(0),
  role: z.string().default(''),
  years: z.number().default(0),
  location: z.string().optional(),
  salary: z.string().optional(),
  availability: z.string().optional(),
  fitVerdict: z.enum(['strong-fit', 'good-fit', 'partial-fit', 'not-a-fit']).optional(),
  fitSummary: z.string().optional(),
  whyNotFit: z.string().optional(),
  scores: z.record(z.string(), z.unknown()).default({}),
  summary: z.string().default(''),
  skills: z.array(z.unknown()).default([]),
  domains: z.array(z.unknown()).default([]),
  gaps: z.array(z.unknown()).default([]),
  leadership: z.array(z.unknown()).default([]),
  softSkills: z.array(z.unknown()).default([]),
  analysis: z.unknown().nullable().default(null),
})

export type OpusAnalysisResult = z.infer<typeof opusAnalysisSchema>

export const responsivenessAnalysisSchema = z.object({
  positionSummary: z.string().default(''),
  verdicts: z.array(
    z.object({
      mentionCommentId: z.number(),
      taggedLeadEmail: z.string(),
      stillNeedsResponse: z.boolean().default(true),
      confidence: z.number().min(0).max(100).default(50),
      reasoning: z.string().default('Unable to determine'),
    })
  ),
})

export type ResponsivenessAnalysisResult = z.infer<typeof responsivenessAnalysisSchema>

export const positionAttentionSchema = z.object({
  attentionState: z.enum(['NEEDS_COE_ACTION', 'WAITING_ON_CLIENT', 'ON_TRACK']),
  ballWith: z.string().default('Unknown'),
  summary: z.string().default('Unable to determine current status.'),
  confidence: z.number().min(0).max(100).default(50),
})

export type PositionAttentionResult = z.infer<typeof positionAttentionSchema>
