import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { createLogger } from './services/logger'
import type { ModelConfig } from '../shared/model-config-types'
import { buildDefaultFeatures } from '../shared/model-config-types'

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

interface ClaudeConfig {
  haikuModel: string
  sonnetModel: string
  opusModel: string
  timeoutSeconds: number
  maxConcurrency: number
  haikuMaxConcurrency: number
}

interface ExecApiConfig {
  apiUrl: string
}

interface AppConfig {
  upstream: UpstreamConfig
  catalog: CatalogConfig
  voyage: VoyageConfig
  claude: ClaudeConfig
  modelConfig: ModelConfig
  execApi: ExecApiConfig
}

const DEFAULT_CONFIG: AppConfig = {
  upstream: {
    apiUrl: 'https://unocoreapi.azurewebsites.net/',
  },
  catalog: {
    apiUrl: 'https://unocoreapi.azurewebsites.net/api/',
  },
  execApi: {
    apiUrl: 'https://execapi.azurewebsites.net/',
  },
  voyage: {
    apiUrl: 'https://api.voyageai.com/v1',
    defaultModel: 'voyage-4-large',
    apiKeys: [],
  },
  claude: {
    haikuModel: 'claude-haiku-4-5',
    sonnetModel: 'sonnet',
    opusModel: 'sonnet',
    timeoutSeconds: 120,
    maxConcurrency: 8,
    haikuMaxConcurrency: 20,
  },
  modelConfig: {
    presetMode: 'claude',
    localServerUrl: 'http://localhost:8080',
    localDefaultModel: '',
    concurrency: {
      claude: { max: 8, haikuMax: 20 },
      local: { max: 1 },
    },
    features: buildDefaultFeatures('claude', ''),
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
      const claudeSection = { ...DEFAULT_CONFIG.claude, ...(parsed.claude ?? (parsed as Record<string, unknown>).claudeProxy as Partial<ClaudeConfig>) }
      const savedModelConfig = (parsed as Record<string, unknown>).modelConfig as Partial<ModelConfig> | undefined
      const modelConfig: ModelConfig = savedModelConfig
        ? {
            ...DEFAULT_CONFIG.modelConfig,
            ...savedModelConfig,
            concurrency: {
              ...DEFAULT_CONFIG.modelConfig.concurrency,
              ...(savedModelConfig.concurrency ?? {}),
              claude: { ...DEFAULT_CONFIG.modelConfig.concurrency.claude, ...(savedModelConfig.concurrency?.claude ?? {}) },
              local: { ...DEFAULT_CONFIG.modelConfig.concurrency.local, ...(savedModelConfig.concurrency?.local ?? {}) },
            },
            features: { ...DEFAULT_CONFIG.modelConfig.features, ...(savedModelConfig.features ?? {}) },
          }
        : {
            ...DEFAULT_CONFIG.modelConfig,
            concurrency: {
              claude: { max: claudeSection.maxConcurrency, haikuMax: claudeSection.haikuMaxConcurrency },
              local: { max: 1 },
            },
          }
      cachedConfig = {
        upstream: { ...DEFAULT_CONFIG.upstream, ...parsed.upstream },
        catalog: { ...DEFAULT_CONFIG.catalog, ...parsed.catalog },
        voyage: { ...DEFAULT_CONFIG.voyage, ...parsed.voyage },
        claude: claudeSection,
        modelConfig,
        execApi: { ...DEFAULT_CONFIG.execApi, ...(parsed as Record<string, unknown>).execApi as Partial<ExecApiConfig> },
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

