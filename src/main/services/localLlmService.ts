import { createLogger } from './logger'

const log = createLogger('LocalLLM')

let cumulativeUsage = { inputTokens: 0, outputTokens: 0 }

export const localLlmService = {
  async chatAsync(
    baseUrl: string,
    model: string,
    prompt: string,
    maxTokens = 4096,
    temperature = 0.1,
    systemPrompt?: string,
    signal?: AbortSignal
  ): Promise<{ text: string; usage: { inputTokens: number; outputTokens: number } }> {
    const messages: { role: string; content: string }[] = []
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt })
    messages.push({ role: 'user', content: prompt })

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
      signal,
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      throw new Error(
        `Local LLM error (${response.status}): ${errorText || response.statusText}. ` +
        `Check that your OLMX server is running at ${baseUrl}`
      )
    }

    const data = await response.json() as {
      choices?: { message?: { content?: string } }[]
      usage?: { prompt_tokens?: number; completion_tokens?: number }
    }

    const text = data.choices?.[0]?.message?.content ?? ''
    if (!text) throw new Error('Empty response from local LLM')

    const inputTokens = data.usage?.prompt_tokens ?? 0
    const outputTokens = data.usage?.completion_tokens ?? 0
    cumulativeUsage.inputTokens += inputTokens
    cumulativeUsage.outputTokens += outputTokens

    log.info('Local LLM call completed', { model, inputTokens, outputTokens, resultLength: text.length })
    return { text, usage: { inputTokens, outputTokens } }
  },

  async checkHealth(baseUrl: string): Promise<{ available: boolean; models: string[] }> {
    try {
      const response = await fetch(`${baseUrl}/v1/models`, {
        signal: AbortSignal.timeout(5000),
      })
      if (!response.ok) return { available: false, models: [] }
      const data = await response.json() as { data?: { id: string }[] }
      const models = (data.data ?? []).map((m) => m.id)
      return { available: true, models }
    } catch {
      return { available: false, models: [] }
    }
  },

  getTokenUsage() {
    return { ...cumulativeUsage }
  },

  resetTokenUsage() {
    cumulativeUsage = { inputTokens: 0, outputTokens: 0 }
  },
}
