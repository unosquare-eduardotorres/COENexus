import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { createLogger } from './services/logger'

const log = createLogger('Config')

interface UpstreamConfig {
  apiUrl: string
}

interface CatalogConfig {
  apiUrl: string
}

interface VoyageConfig {
  apiUrl: string
  defaultModel: string
  apiKeys: string[]
}

interface ClaudeProxyConfig {
  baseUrl: string
  haikuModel: string
  sonnetModel: string
  opusModel: string
  timeoutSeconds: number
  maxConcurrency: number
  haikuMaxConcurrency: number
  apiKey: string
}

interface AppConfig {
  upstream: UpstreamConfig
  catalog: CatalogConfig
  voyage: VoyageConfig
  claudeProxy: ClaudeProxyConfig
}

const DEFAULT_CONFIG: AppConfig = {
  upstream: {
    apiUrl: 'https://internal-api.unosquare.com/elp/',
  },
  catalog: {
    apiUrl: 'https://internal-api.unosquare.com/corecatalogs/api/',
  },
  voyage: {
    apiUrl: 'https://api.voyageai.com/v1',
    defaultModel: 'voyage-4-large',
    apiKeys: [],
  },
  claudeProxy: {
    baseUrl: 'http://localhost:3456',
    haikuModel: 'claude-haiku-4-20250414',
    sonnetModel: 'claude-sonnet-4-20250514',
    opusModel: 'claude-opus-4-20250514',
    timeoutSeconds: 120,
    maxConcurrency: 8,
    haikuMaxConcurrency: 20,
    apiKey: 'nexus-local-dev',
  },
}

let cachedConfig: AppConfig | null = null

export function getConfigPath(): string {
  return join(app.getPath('userData'), 'config.json')
}

export function getConfig(): AppConfig {
  if (cachedConfig) return cachedConfig

  const configPath = getConfigPath()

  if (existsSync(configPath)) {
    try {
      const raw = readFileSync(configPath, 'utf-8')
      const parsed = JSON.parse(raw) as Partial<AppConfig>
      cachedConfig = {
        upstream: { ...DEFAULT_CONFIG.upstream, ...parsed.upstream },
        catalog: { ...DEFAULT_CONFIG.catalog, ...parsed.catalog },
        voyage: { ...DEFAULT_CONFIG.voyage, ...parsed.voyage },
        claudeProxy: { ...DEFAULT_CONFIG.claudeProxy, ...parsed.claudeProxy },
      }
      return cachedConfig
    } catch (err) {
      log.error('Failed to parse config file, using defaults', err instanceof Error ? err : new Error(String(err)))
      cachedConfig = { ...DEFAULT_CONFIG }
      return cachedConfig
    }
  }

  cachedConfig = { ...DEFAULT_CONFIG }
  return cachedConfig
}

export function saveConfig(config: AppConfig): void {
  const configPath = getConfigPath()
  const dir = join(configPath, '..')

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
  cachedConfig = config
}

