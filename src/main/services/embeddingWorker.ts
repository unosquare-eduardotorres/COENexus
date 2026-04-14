import { embeddingJobQueue, type EmbeddingJob } from './embeddingJobQueue'
import { upstreamApiService } from './upstreamApiService'
import { voyageEmbeddingService } from './voyageEmbeddingService'
import { resumeTextExtractor } from './resumeTextExtractor'
import { embeddingRepository } from '../db/repositories/embeddingRepository'
import { matchRepository } from '../db/repositories/matchRepository'
import { createLogger } from './logger'

const log = createLogger('EmbeddingWorker')
import { syncRepository } from '../db/repositories/syncRepository'

let running = false
let stopRequested = false

function sanitizeUnicode(text: string): string {
  return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
}

function buildEnrichedTextForEmployee(name: string, skill: string, seniority: string, jobTitle: string, resumeText: string): string {
  const parts = [`Name: ${name}`]
  if (skill) parts.push(`Main Skill: ${skill}`)
  if (seniority) parts.push(`Seniority: ${seniority}`)
  if (jobTitle) parts.push(`Job Title: ${jobTitle}`)
  parts.push('', 'Resume:', resumeText)
  return parts.join('\n')
}

function buildEnrichedTextForPosition(account: string, mainSkill: string, jobTitle: string, jobDescription: string): string {
  const parts = []
  if (account) parts.push(`Account: ${account}`)
  if (jobTitle) parts.push(`Job Title: ${jobTitle}`)
  if (mainSkill) parts.push(`Main Skill: ${mainSkill}`)
  if (jobDescription) {
    parts.push('', 'Job Description:', jobDescription)
  }
  return parts.join('\n')
}

async function processJob(job: EmbeddingJob): Promise<void> {
  const table = job.source === 'employees' ? 'synced_employees' as const
    : job.source === 'candidates' ? 'synced_candidates' as const
    : 'synced_open_positions' as const

  try {
    syncRepository.updateStatus(table, job.dbId, 'processing')

    let textToVectorize: string

    if (job.source === 'positions') {
      const position = syncRepository.findPositionByUpstreamId(job.upstreamId)
      if (!position) throw new Error(`Position ${job.upstreamId} not found`)
      textToVectorize = buildEnrichedTextForPosition(
        position.account, position.main_skill, position.job_title, position.job_description
      )
    } else {
      if (!job.resumeNoteId) throw new Error(`No resume note ID for ${job.source} ${job.upstreamId}`)

      const fileBytes = await upstreamApiService.getNoteFile(job.token, job.resumeNoteId)
      const buffer = Buffer.from(fileBytes)
      const resumeText = await resumeTextExtractor.extractText(buffer, job.resumeFilename ?? 'resume.pdf')
      const cleanText = sanitizeUnicode(resumeText)

      if (!cleanText.trim()) throw new Error('Empty resume text after extraction')

      if (job.source === 'employees') {
        const employee = syncRepository.findEmployeeByUpstreamId(job.upstreamId)
        textToVectorize = buildEnrichedTextForEmployee(
          job.name,
          employee?.main_skill ?? '',
          employee?.seniority ?? '',
          employee?.job_title ?? '',
          cleanText
        )
      } else {
        textToVectorize = cleanText
      }
    }

    const vector = await voyageEmbeddingService.generateEmbedding(textToVectorize, job.model)

    embeddingRepository.upsert({
      sourceType: job.source,
      sourceId: job.dbId,
      upstreamId: job.upstreamId,
      embedding: vector,
      resumeText: textToVectorize,
      isBench: job.isBench,
    })

    const invalidated = matchRepository.invalidateCacheForCandidate(job.upstreamId)
    if (invalidated > 0) {
      log.info(`Invalidated ${invalidated} cached analysis entries for ${job.source}/${job.upstreamId}`)
    }

    syncRepository.updateStatus(table, job.dbId, 'vectorized')
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Unknown error'
    log.error(`Failed job for ${job.source}/${job.upstreamId}: ${reason}`)
    syncRepository.markFailed(table, job.dbId, 'vectorize_failed', reason)
  }
}

export const embeddingWorker = {
  start(): void {
    if (running) return
    running = true
    stopRequested = false

    const loop = async () => {
      while (!stopRequested) {
        try {
          const job = await Promise.race([
            embeddingJobQueue.dequeue(),
            new Promise<null>(resolve => {
              const check = () => {
                if (stopRequested) resolve(null)
                else setTimeout(check, 500)
              }
              check()
            }),
          ])

          if (!job) break

          await processJob(job)

          await new Promise(resolve => setImmediate(resolve))
        } catch (err) {
          log.error('Loop error', err instanceof Error ? err : new Error(String(err)))
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
      running = false
    }

    loop()
  },

  stop(): void {
    stopRequested = true
  },

  get isRunning(): boolean {
    return running
  },
}
