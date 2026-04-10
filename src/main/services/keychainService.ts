import { safeStorage, app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs'
import { createLogger } from './logger'

const log = createLogger('Keychain')
const KEYS_FILE = 'voyage-keys.enc'

function getKeysPath(): string {
  return join(app.getPath('userData'), KEYS_FILE)
}

function readKeys(): string[] {
  const path = getKeysPath()
  if (!existsSync(path)) return []
  if (!safeStorage.isEncryptionAvailable()) return []
  try {
    const encrypted = readFileSync(path)
    const decrypted = safeStorage.decryptString(encrypted)
    return JSON.parse(decrypted) as string[]
  } catch (err) {
    log.error('Failed to decrypt Voyage keys', err instanceof Error ? err : new Error(String(err)))
    return []
  }
}

function writeKeys(keys: string[]): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Secure storage not available on this system')
  }
  const encrypted = safeStorage.encryptString(JSON.stringify(keys))
  writeFileSync(getKeysPath(), encrypted)
}

export const keychainService = {
  isAvailable(): boolean {
    return safeStorage.isEncryptionAvailable()
  },

  getVoyageKeys(): string[] {
    return readKeys()
  },

  addVoyageKey(apiKey: string): void {
    const keys = readKeys()
    keys.push(apiKey)
    writeKeys(keys)
    log.info(`Voyage API key added to secure storage (total: ${keys.length})`)
  },

  removeVoyageKey(index: number): void {
    const keys = readKeys()
    if (index < 0 || index >= keys.length) {
      throw new Error(`Invalid key index: ${index}`)
    }
    keys.splice(index, 1)
    if (keys.length === 0) {
      const path = getKeysPath()
      if (existsSync(path)) unlinkSync(path)
    } else {
      writeKeys(keys)
    }
    log.info(`Voyage API key removed from secure storage (remaining: ${keys.length})`)
  },

  clearAllVoyageKeys(): void {
    const path = getKeysPath()
    if (existsSync(path)) {
      unlinkSync(path)
      log.info('All Voyage API keys removed from secure storage')
    }
  },

  getMaskedKeys(): Array<{ index: number; masked: string }> {
    const keys = readKeys()
    return keys.map((key, index) => ({
      index,
      masked: key.length > 8
        ? `${key.slice(0, 3)}...${key.slice(-4)}`
        : '********',
    }))
  },
}
