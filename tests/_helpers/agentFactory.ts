import { vi } from 'vitest'
import { ScriptedClaudeClient, installClaudeSdkMock } from './claudeMock'
import { createMockLogger } from './mockLogger'

export interface AgentTestHarness {
  claudeClient: ScriptedClaudeClient
  emittedEvents: unknown[]
  emit: (...args: unknown[]) => void
  abortController: AbortController
  mockConfig: ReturnType<typeof createDefaultConfig>
}

function createDefaultConfig() {
  return {
    claude: {
      sonnetModel: 'claude-sonnet-4-20250514',
      haikuModel: 'claude-3-5-haiku-20241022',
    },
    voyage: {
      apiKey: 'test-voyage-key',
      model: 'voyage-4-large',
    },
    upstream: {
      baseUrl: 'https://api.test.local',
    },
  }
}

export function createAgentHarness(options?: {
  configOverrides?: Record<string, unknown>
}): AgentTestHarness {
  const claudeClient = new ScriptedClaudeClient()
  const emittedEvents: unknown[] = []
  const emit = vi.fn((...args: unknown[]) => {
    if (args.length === 1 && typeof args[0] === 'object') {
      emittedEvents.push(args[0])
    } else {
      emittedEvents.push(args)
    }
  })
  const abortController = new AbortController()

  const mockConfig = {
    ...createDefaultConfig(),
    ...options?.configOverrides,
  }

  installClaudeSdkMock(claudeClient)

  vi.doMock('../../src/main/config', () => ({
    getConfig: () => mockConfig,
  }))

  vi.doMock('electron', () => ({
    app: {
      getVersion: vi.fn(() => '1.0.0-test'),
      getPath: vi.fn((name: string) => `/tmp/test-${name}`),
    },
  }))

  vi.doMock('../../src/main/services/logger', () => ({
    createLogger: () => createMockLogger(),
  }))

  vi.doMock('../../src/main/services/claudeService', () => ({
    claudeService: {
      chatAsync: vi.fn(),
      getTokenUsage: vi.fn(() => ({ inputTokens: 0, outputTokens: 0 })),
      resetTokenUsage: vi.fn(),
      trackExternalUsage: vi.fn(),
      checkAvailability: vi.fn().mockResolvedValue(true),
    },
  }))

  return {
    claudeClient,
    emittedEvents,
    emit,
    abortController,
    mockConfig,
  }
}

export function createMinimalEmitter() {
  const events: Array<{ type: string; [key: string]: unknown }> = []
  const emit = (e: { type: string; [key: string]: unknown }) => {
    events.push(e)
  }
  return { events, emit }
}

export function findEvents<T = Record<string, unknown>>(
  events: Array<Record<string, unknown>>,
  type: string
): T[] {
  return events.filter(e => e.type === type) as T[]
}

export function findLogMessages(events: Array<Record<string, unknown>>): string[] {
  return events
    .filter(e => e.type === 'log')
    .map(e => e.message as string)
    .filter(Boolean)
}
