import { z } from 'zod'

export const haikuTriageSchema = z.object({
  relevant: z.boolean().default(false),
  score: z.number().min(0).max(100).default(0),
  reason: z.string().default(''),
})

export type HaikuTriageResult = z.infer<typeof haikuTriageSchema>

export const opusAnalysisSchema = z.object({
  matchScore: z.number().default(0),
  role: z.string().default(''),
  years: z.number().default(0),
  location: z.string().optional(),
  salary: z.string().optional(),
  availability: z.string().optional(),
  scores: z.record(z.unknown()).default({}),
  summary: z.string().default(''),
  skills: z.array(z.unknown()).default([]),
  domains: z.array(z.unknown()).default([]),
  gaps: z.array(z.unknown()).default([]),
  leadership: z.array(z.unknown()).default([]),
  softSkills: z.array(z.unknown()).default([]),
  analysis: z.unknown().nullable().default(null),
})

export type OpusAnalysisResult = z.infer<typeof opusAnalysisSchema>
