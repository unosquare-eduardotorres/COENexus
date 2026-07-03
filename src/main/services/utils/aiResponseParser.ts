import { z } from 'zod'
import { createLogger } from '../logger'

const log = createLogger('AiResponseParser')

export function parseAiResponse<T>(raw: string, schema: z.ZodType<T>, context?: string): T {
  const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()
  try {
    const parsed = JSON.parse(cleaned)
    return schema.parse(parsed)
  } catch (err) {
    log.error(
      `AI response parse failed${context ? ` (${context})` : ''}`,
      err instanceof Error ? err : new Error(String(err)),
      { rawResponse: raw.slice(0, 500) }
    )
    throw err
  }
}
