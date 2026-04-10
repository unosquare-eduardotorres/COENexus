import { z } from 'zod'

export const syncStartSchema = z.object({
  source: z.string().min(1),
  token: z.string().min(1),
  limit: z.number().int().positive().optional(),
  skip: z.number().int().nonnegative().optional(),
  year: z.number().int().min(2000).max(2100).optional(),
})

export const syncSingleSchema = z.object({
  source: z.string().min(1),
  token: z.string().min(1),
  upstreamId: z.number().int().positive(),
})

export const syncRetrySchema = z.object({
  source: z.string().min(1),
  token: z.string().min(1),
})

export const syncUploadNoteSchema = z.object({
  token: z.string().min(1),
  personId: z.number().int().positive(),
  noteType: z.string().min(1),
  fileName: z.string().min(1),
  fileContent: z.instanceof(ArrayBuffer),
})

export const processingVectorizeSingleSchema = z.object({
  source: z.string().min(1),
  upstreamId: z.number().int().positive(),
  model: z.string().optional(),
})

export const processingStartExtractionSchema = z.object({
  source: z.string().min(1),
  token: z.string().min(1),
})

export const processingStartVectorizationSchema = z.object({
  source: z.string().min(1),
  model: z.string().optional(),
})

export const matchSearchSchema = z.object({
  name: z.string().min(1),
  matchFlowType: z.enum(['find-for-position', 'match-to-positions', 'delivery-to-op', 'bench-burn', 'external-candidate-to-op']),
  jdSource: z.enum(['position', 'custom']),
  jobDescription: z.string().min(1),
  dataSource: z.enum(['bench', 'all-employees', 'candidates', 'all-sources']),
  topN: z.number().int().min(1).max(100),
  searchMode: z.enum(['vector', 'haiku', 'opus']),
  constraints: z.object({
    candidateFilters: z.array(z.object({
      id: z.string(),
      field: z.string(),
      operator: z.string(),
      value: z.union([z.string(), z.number(), z.boolean()]),
      currency: z.string().optional(),
      connector: z.enum(['and', 'or']),
    })),
    employeeFilters: z.array(z.object({
      id: z.string(),
      field: z.string(),
      operator: z.string(),
      value: z.union([z.string(), z.number(), z.boolean()]),
      currency: z.string().optional(),
      connector: z.enum(['and', 'or']),
    })),
  }).optional(),
  haikuPromptConfig: z.object({
    promptTemplate: z.string(),
    maxTokens: z.number(),
    temperature: z.number(),
  }).optional(),
  opusPromptConfig: z.object({
    promptTemplate: z.string(),
    maxTokens: z.number(),
    temperature: z.number(),
  }).optional(),
  candidateUpstreamIds: z.array(z.number()).optional(),
})

export const matchConfirmHaikuSchema = z.object({
  searchId: z.string().min(1),
  action: z.string().min(1),
})

export const matchResumeTextSchema = z.object({
  sourceType: z.string().min(1),
  upstreamId: z.number().int().positive(),
})

export const benchBurnSchema = z.object({
  name: z.string().min(1),
  matchFlowType: z.enum(['bench-burn', 'delivery-to-op']).optional(),
  employeeUpstreamIds: z.array(z.number()),
  positionUpstreamIds: z.array(z.number()),
  searchMode: z.literal('opus'),
  topNPerEmployee: z.number().int().min(1),
  topNPerPosition: z.number().int().min(1),
  opusPromptConfig: z.object({
    promptTemplate: z.string(),
    maxTokens: z.number(),
    temperature: z.number(),
  }).optional(),
  customPositions: z.array(z.object({
    name: z.string(),
    jobDescription: z.string(),
  })).optional(),
})

export const externalCandidateSchema = z.object({
  name: z.string().min(1),
  matchFlowType: z.literal('external-candidate-to-op'),
  positionUpstreamIds: z.array(z.number()),
  candidates: z.array(z.object({
    name: z.string(),
    resumeText: z.string(),
  })),
  opusPromptConfig: z.object({
    promptTemplate: z.string(),
    maxTokens: z.number(),
    temperature: z.number(),
  }).optional(),
  customPosition: z.object({
    name: z.string(),
    jobDescription: z.string(),
  }).optional(),
})

export const sessionsCreateSchema = z.object({
  name: z.string().min(1),
  contextType: z.enum(['candidate', 'employee', 'upload']),
  contextId: z.number().nullable().optional(),
  contextName: z.string().nullable().optional(),
  processingMode: z.string().optional(),
  refinementMode: z.string().optional(),
  jobDescription: z.string().nullable().optional(),
  jobDescriptionSource: z.string().nullable().optional(),
  selectedPositionId: z.string().nullable().optional(),
  resumeContentJson: z.string().nullable().optional(),
  wizardStateJson: z.string().nullable().optional(),
  status: z.string().optional(),
})

export const sessionsUpdateSchema = z.object({
  name: z.string().optional(),
  contextType: z.enum(['candidate', 'employee', 'upload']).optional(),
  contextId: z.number().nullable().optional(),
  contextName: z.string().nullable().optional(),
  processingMode: z.string().optional(),
  refinementMode: z.string().optional(),
  jobDescription: z.string().nullable().optional(),
  jobDescriptionSource: z.string().nullable().optional(),
  selectedPositionId: z.string().nullable().optional(),
  resumeContentJson: z.string().nullable().optional(),
  wizardStateJson: z.string().nullable().optional(),
  status: z.string().optional(),
})

export const databaseSaveConfigSchema = z.object({
  sharing: z.object({
    sharedPath: z.string(),
    exporterName: z.string(),
  }).optional(),
  voyage: z.object({
    apiKeys: z.array(z.string()).optional(),
    defaultModel: z.string().optional(),
  }).optional(),
  claudeProxy: z.object({
    baseUrl: z.string().optional(),
  }).optional(),
})

export const databaseImportSchema = z.object({
  filename: z.string().min(1),
})

export const aiChatSchema = z.object({
  model: z.string().min(1),
  messages: z.array(z.object({
    role: z.string(),
    content: z.string(),
  })).min(1),
  maxTokens: z.number().int().positive().optional(),
})

export const addVoyageKeySchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
})

export const removeVoyageKeySchema = z.object({
  index: z.number().int().min(0),
})

export function validatePayload<T>(schema: z.ZodSchema<T>, data: unknown, channel: string): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`[${channel}] Invalid payload: ${issues}`)
  }
  return result.data
}
