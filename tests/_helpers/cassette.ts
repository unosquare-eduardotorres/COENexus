import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { createHash } from 'node:crypto'
import type { SdkMessage } from './claudeMock'

export interface CassetteEntry {
  promptHash: string
  systemHash: string
  prompt: string
  systemPromptPreview: string
  messages: SdkMessage[]
  recordedAt: string
}

export interface Cassette {
  name: string
  entries: CassetteEntry[]
}

const CASSETTES_DIR = join(__dirname, '..', 'cassettes')

function hashString(input: string): string {
  return createHash('sha256').update(input).digest('hex').slice(0, 16)
}

function ensureCassettesDir() {
  if (!existsSync(CASSETTES_DIR)) {
    mkdirSync(CASSETTES_DIR, { recursive: true })
  }
}

function cassettePath(name: string): string {
  return join(CASSETTES_DIR, `${name}.json`)
}

export function loadCassette(name: string): Cassette | null {
  const path = cassettePath(name)
  if (!existsSync(path)) return null

  const content = readFileSync(path, 'utf-8')
  return JSON.parse(content) as Cassette
}

export function saveCassette(cassette: Cassette): void {
  ensureCassettesDir()
  const path = cassettePath(cassette.name)
  writeFileSync(path, JSON.stringify(cassette, null, 2), 'utf-8')
}

export function findEntry(
  cassette: Cassette,
  prompt: string,
  systemPrompt?: string
): CassetteEntry | undefined {
  const promptHash = hashString(prompt)
  const systemHash = systemPrompt ? hashString(systemPrompt) : ''

  return cassette.entries.find(entry => {
    if (entry.promptHash !== promptHash) return false
    if (systemHash && entry.systemHash !== systemHash) return false
    return true
  })
}

export function recordEntry(
  cassette: Cassette,
  prompt: string,
  systemPrompt: string,
  messages: SdkMessage[]
): void {
  const entry: CassetteEntry = {
    promptHash: hashString(prompt),
    systemHash: hashString(systemPrompt),
    prompt: prompt.slice(0, 500),
    systemPromptPreview: systemPrompt.slice(0, 200),
    messages,
    recordedAt: new Date().toISOString(),
  }

  const existingIndex = cassette.entries.findIndex(
    e => e.promptHash === entry.promptHash && e.systemHash === entry.systemHash
  )

  if (existingIndex >= 0) {
    cassette.entries[existingIndex] = entry
  } else {
    cassette.entries.push(entry)
  }
}

export class CassetteReplayClient {
  private cassette: Cassette

  constructor(cassetteName: string) {
    const loaded = loadCassette(cassetteName)
    if (!loaded) {
      throw new Error(`Cassette "${cassetteName}" not found at ${cassettePath(cassetteName)}`)
    }
    this.cassette = loaded
  }

  createQueryMock() {
    const self = this
    return ({ prompt, options }: {
      prompt: string
      options?: { systemPrompt?: string }
    }) => {
      const entry = findEntry(self.cassette, prompt, options?.systemPrompt)
      if (!entry) {
        throw new Error(
          `CassetteReplayClient: no matching entry for prompt "${prompt.slice(0, 80)}..."`
        )
      }

      async function* generate() {
        for (const msg of entry!.messages) {
          yield msg
        }
      }

      return generate()
    }
  }
}
