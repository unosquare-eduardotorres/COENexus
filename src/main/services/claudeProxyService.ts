import { getConfig } from '../config'
import { createLogger } from './logger'

const log = createLogger('ClaudeProxy')

interface ChatMessage {
  role: string
  content: string
}

interface ChatChoice {
  message: { content: string }
}

interface ChatCompletionResponse {
  choices: ChatChoice[]
}

const MAX_RETRIES = 5
const BACKOFF_SECONDS = [2, 5, 10, 20, 40]

export const claudeProxyService = {
  async chatAsync(
    model: string,
    prompt: string,
    maxTokens = 4096,
    temperature = 0.1,
    systemPrompt?: string,
    signal?: AbortSignal
  ): Promise<string> {
    const { claudeProxy } = getConfig()
    const baseUrl = claudeProxy.baseUrl.replace(/\/+$/, '')

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const messages: ChatMessage[] = []
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt })
      messages.push({ role: 'user', content: prompt })

      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, max_tokens: maxTokens, temperature, messages }),
        signal,
      })

      if (response.status === 429 && attempt < MAX_RETRIES) {
        const retryAfter = parseInt(response.headers.get('retry-after') ?? '', 10)
        const delay = isNaN(retryAfter) ? BACKOFF_SECONDS[Math.min(attempt, BACKOFF_SECONDS.length - 1)] : retryAfter
        log.warn(`${model} 429 rate-limited, waiting ${delay}s (retry ${attempt + 1}/${MAX_RETRIES})`)
        await new Promise(resolve => setTimeout(resolve, delay * 1000))
        continue
      }

      if (!response.ok) {
        throw new Error(`Claude proxy error ${response.status}: ${response.statusText}`)
      }

      const result = (await response.json()) as ChatCompletionResponse
      const content = result.choices?.[0]?.message?.content
      if (!content) throw new Error('Empty chat completion response')
      return content
    }

    throw new Error('Claude proxy rate limit exceeded after all retries')
  },

  async checkAvailability(): Promise<boolean> {
    const { claudeProxy } = getConfig()
    const baseUrl = claudeProxy.baseUrl.replace(/\/+$/, '')
    try {
      const response = await fetch(`${baseUrl}/v1/models`, {
        signal: AbortSignal.timeout(5000),
      })
      return response.ok
    } catch (err) {
      log.error('Availability check failed', err instanceof Error ? err : new Error(String(err)))
      return false
    }
  },
}
