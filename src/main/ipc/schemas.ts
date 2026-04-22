import { z } from 'zod'

export const syncStartSchema = z.object({
  source: z.string().min(1),
  token: z.string().min(1),
  limit: z.number().int().positive().optional(),
  skip: z.number().int().nonnegative().optional(),
  year: z.number().int().min(2000).max(2100).optional(),
  activeOnly: z.boolean().optional(),
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

export const processingProcessAllSchema = z.object({
  source: z.string().min(1),
  token: z.string().min(1),
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

export const presentCreateSessionSchema = z.object({
  name: z.string().optional(),
  mode: z.string().optional(),
  openPositionId: z.number().int().positive().optional(),
  positionTitle: z.string().optional(),
  accountName: z.string().optional(),
  positionUpstreamId: z.number().int().positive().optional(),
  jobDescription: z.string().optional(),
})

export const presentUpdateSessionSchema = z.object({
  name: z.string().optional(),
  mode: z.string().optional(),
  introText: z.string().optional(),
  status: z.string().optional(),
  openPositionId: z.number().int().positive().optional(),
  positionTitle: z.string().optional(),
  accountName: z.string().optional(),
  positionUpstreamId: z.number().int().positive().optional(),
  jobDescription: z.string().optional(),
})

export const presentAddEntrySchema = z.object({
  sessionId: z.number().int().positive(),
  sourceType: z.string().min(1),
  upstreamId: z.number().int().positive(),
  fullName: z.string().min(1),
  mainSkill: z.string().min(1),
  seniority: z.string().min(1),
  country: z.string().min(1),
  yearsOfExperience: z.string().optional(),
  availability: z.string().optional(),
  recommendedRate: z.string().optional(),
  techStack: z.array(z.string()).optional(),
  professionalSummary: z.string().optional(),
  domainExperience: z.string().optional(),
  resumeFormatStatus: z.string().optional(),
  transformSessionId: z.number().int().positive().optional(),
  individualIntroText: z.string().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
})

export const presentUpdateEntrySchema = z.object({
  sourceType: z.string().min(1).optional(),
  upstreamId: z.number().int().positive().optional(),
  fullName: z.string().min(1).optional(),
  mainSkill: z.string().min(1).optional(),
  seniority: z.string().min(1).optional(),
  country: z.string().min(1).optional(),
  yearsOfExperience: z.string().optional(),
  availability: z.string().optional(),
  recommendedRate: z.string().optional(),
  techStack: z.array(z.string()).optional(),
  professionalSummary: z.string().optional(),
  domainExperience: z.string().optional(),
  resumeFormatStatus: z.string().optional(),
  transformSessionId: z.number().int().positive().optional(),
  individualIntroText: z.string().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
})

export const presentCheckResumeFormatSchema = z.object({
  resumeText: z.string().min(1),
})

export const presentTransformResumeSchema = z.object({
  resumeText: z.string().min(1),
  fullName: z.string().min(1),
  jobDescription: z.string().optional(),
})

export const presentGenerateIntroSchema = z.object({
  candidateNames: z.array(z.string().min(1)).min(1),
  positionTitle: z.string().optional(),
  accountName: z.string().optional(),
  jobDescription: z.string().optional(),
  mainSkill: z.string().optional(),
})

export const presentGenerateCandidateProfileSchema = z.object({
  resumeText: z.string().min(1),
  fullName: z.string().min(1),
  mainSkill: z.string().min(1),
  jobDescription: z.string().optional(),
  positionTitle: z.string().optional(),
})

export const presentGenerateHtmlSchema = z.object({
  sessionId: z.number().int().positive(),
  mode: z.string().min(1),
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

export const pipelineStartSchema = z.object({
  source: z.enum(['employees', 'candidates']),
  token: z.string().min(1),
  model: z.string().optional(),
  limit: z.number().int().positive().optional(),
  skip: z.number().int().nonnegative().optional(),
  year: z.number().int().min(2000).max(2100).optional(),
  activeOnly: z.boolean().optional(),
})

export const pipelineRetrySchema = z.object({
  source: z.enum(['employees', 'candidates']),
  token: z.string().min(1),
  model: z.string().optional(),
})

export const pipelineRetrySingleSchema = z.object({
  source: z.enum(['employees', 'candidates']),
  token: z.string().min(1),
  model: z.string().optional(),
  upstreamId: z.number().int().positive(),
})

export const positionPipelineStartSchema = z.object({
  token: z.string().min(1),
  model: z.string().optional(),
  activeOnly: z.boolean(),
  limit: z.number().int().positive().optional(),
  skip: z.number().int().nonnegative().optional(),
})

export const positionPipelineVectorizeSyncedSchema = z.object({
  token: z.string().min(1),
  model: z.string().optional(),
})

export function validatePayload<T>(schema: z.ZodType<T>, data: unknown, channel: string): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`[${channel}] Invalid payload: ${issues}`)
  }
  return result.data
}
