import { getConfig } from '../config'
import { createLogger } from './logger'

const log = createLogger('Voyage')

interface VoyageData {
  embedding: number[]
}

interface VoyageResponse {
  data: VoyageData[]
}

const MAX_RETRIES = 5
const BACKOFF_SECONDS = [2, 5, 10, 20, 40]

let keyIndex = 0

function getNextApiKey(): string {
  const { voyage } = getConfig()
  if (voyage.apiKeys.length === 0) throw new Error('Voyage API key not configured')
  const key = voyage.apiKeys[keyIndex % voyage.apiKeys.length]
  keyIndex++
  return key
}

export const voyageEmbeddingService = {
  async generateEmbedding(
    text: string,
    model?: string,
    signal?: AbortSignal
  ): Promise<Float32Array> {
    const { voyage } = getConfig()
    const apiUrl = voyage.apiUrl.replace(/\/+$/, '')
    const apiKey = getNextApiKey()
    const embeddingModel = model ?? voyage.defaultModel

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const response = await fetch(`${apiUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ input: [text], model: embeddingModel }),
        signal,
      })

      if (response.status === 429 && attempt < MAX_RETRIES) {
        const retryAfter = parseInt(response.headers.get('retry-after') ?? '', 10)
        const delay = isNaN(retryAfter) ? BACKOFF_SECONDS[Math.min(attempt, BACKOFF_SECONDS.length - 1)] : retryAfter
        const keySuffix = apiKey.length > 4 ? apiKey.slice(-4) : '****'
        log.warn(`429 rate-limited on key ...${keySuffix}, waiting ${delay}s (retry ${attempt + 1}/${MAX_RETRIES})`)
        await new Promise(resolve => setTimeout(resolve, delay * 1000))
        continue
      }

      if (!response.ok) {
        throw new Error(`Voyage API error ${response.status}: ${response.statusText}`)
      }

      const result = (await response.json()) as VoyageResponse
      const embedding = result.data?.[0]?.embedding
      if (!embedding) throw new Error('Empty embedding response')
      return new Float32Array(embedding)
    }

    throw new Error('Voyage API rate limit exceeded after all retries')
  },

}
