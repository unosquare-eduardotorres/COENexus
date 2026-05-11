import { vi } from 'vitest'

export interface ContentBlock {
  type: 'text' | 'tool_use' | 'tool_result'
  text?: string
  id?: string
  name?: string
  input?: unknown
  tool_use_id?: string
  content?: string
}

export interface SdkMessage {
  type: 'assistant' | 'result' | 'stream_event'
  message?: { content: ContentBlock[] }
  result?: string
  usage?: { input_tokens: number; output_tokens: number }
  event?: {
    type: string
    delta?: { type: string; text?: string }
  }
}

export interface ScriptedExpectation {
  systemContains?: string
  promptContains?: string
  response: SdkMessage[]
}

export class ScriptedClaudeClient {
  private expectations: ScriptedExpectation[] = []
  private callIndex = 0

  expect(match: { systemContains?: string; promptContains?: string }) {
    const exp: ScriptedExpectation = { ...match, response: [] }
    this.expectations.push(exp)
    return {
      respondWith: (messages: SdkMessage[]) => {
        exp.response = messages
        return this
      },
    }
  }

  createQueryMock() {
    const self = this
    return vi.fn().mockImplementation(({ prompt, options }: {
      prompt: string
      options?: { systemPrompt?: string; [key: string]: unknown }
    }) => {
      const exp = self.expectations[self.callIndex++]
      if (!exp) {
        throw new Error(
          `ScriptedClaudeClient: unexpected call #${self.callIndex} with prompt "${prompt.slice(0, 80)}..."`
        )
      }

      if (exp.systemContains && !options?.systemPrompt?.includes(exp.systemContains)) {
        throw new Error(
          `ScriptedClaudeClient: system prompt mismatch at call #${self.callIndex}. Expected to contain "${exp.systemContains}"`
        )
      }

      if (exp.promptContains && !prompt.includes(exp.promptContains)) {
        throw new Error(
          `ScriptedClaudeClient: user prompt mismatch at call #${self.callIndex}. Expected to contain "${exp.promptContains}"`
        )
      }

      async function* generate() {
        for (const msg of exp.response) {
          yield msg
        }
      }

      return generate()
    })
  }

  assertAllConsumed() {
    if (this.callIndex < this.expectations.length) {
      throw new Error(
        `ScriptedClaudeClient: ${this.expectations.length - this.callIndex} expected calls were not consumed`
      )
    }
  }

  reset() {
    this.expectations = []
    this.callIndex = 0
  }
}

export function textMessage(text: string): SdkMessage {
  return {
    type: 'assistant',
    message: {
      content: [{ type: 'text', text }],
    },
  }
}

export function toolUseMessage(name: string, input: unknown, id?: string): SdkMessage {
  return {
    type: 'assistant',
    message: {
      content: [{
        type: 'tool_use',
        name,
        input,
        id: id ?? `tool_${name}_${Date.now()}`,
      }],
    },
  }
}

export function resultMessage(result: string, tokens?: { input: number; output: number }): SdkMessage {
  return {
    type: 'result',
    result,
    usage: tokens
      ? { input_tokens: tokens.input, output_tokens: tokens.output }
      : { input_tokens: 100, output_tokens: 50 },
  }
}

export function streamDelta(text: string): SdkMessage {
  return {
    type: 'stream_event',
    event: {
      type: 'content_block_delta',
      delta: { type: 'text_delta', text },
    },
  }
}

export function mixedAssistantMessage(blocks: ContentBlock[]): SdkMessage {
  return {
    type: 'assistant',
    message: { content: blocks },
  }
}

export function maxTurnsError(accumulatedText?: string): Error {
  const err = new Error('Claude Code returned an error result: Reached maximum number of turns (8)')
  if (accumulatedText !== undefined) {
    (err as Error & { accumulatedText: string }).accumulatedText = accumulatedText
  }
  return err
}

export function installClaudeSdkMock(client: ScriptedClaudeClient) {
  vi.doMock('@anthropic-ai/claude-agent-sdk', () => ({
    query: client.createQueryMock(),
  }))
}
