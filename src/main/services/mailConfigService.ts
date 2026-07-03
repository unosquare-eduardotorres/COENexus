import { safeStorage, app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs'
import { createLogger } from './logger'
import type { MailSmtpConfig, MailMaskedConfig, MailTestResult } from '../../shared/ipc-types'

const log = createLogger('MailConfig')
const CONFIG_FILE = 'mail-smtp.enc'

function getConfigPath(): string {
  return join(app.getPath('userData'), CONFIG_FILE)
}

function readConfig(): MailSmtpConfig | null {
  const path = getConfigPath()
  if (!existsSync(path)) return null
  if (!safeStorage.isEncryptionAvailable()) {
    log.warn('safeStorage encryption not available — cannot read mail config')
    return null
  }
  try {
    const encrypted = readFileSync(path)
    const decrypted = safeStorage.decryptString(encrypted)
    return JSON.parse(decrypted) as MailSmtpConfig
  } catch (err) {
    log.error('Failed to decrypt mail config', err instanceof Error ? err : new Error(String(err)))
    return null
  }
}

function writeConfig(config: MailSmtpConfig): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Secure storage not available on this system')
  }
  const encrypted = safeStorage.encryptString(JSON.stringify(config))
  writeFileSync(getConfigPath(), encrypted)
}

export const mailConfigService = {
  getConfig(): MailSmtpConfig | null {
    return readConfig()
  },

  getMaskedConfig(): MailMaskedConfig | null {
    const config = readConfig()
    if (!config) return null
    return {
      senderEmail: config.senderEmail,
      displayName: config.displayName,
      passwordConfigured: true,
      smtpHost: config.smtpHost,
      smtpPort: config.smtpPort,
      useTls: config.useTls,
    }
  },

  saveConfig(config: MailSmtpConfig): void {
    writeConfig(config)
    log.info(`Mail SMTP config saved for ${config.senderEmail}`)
  },

  clearConfig(): void {
    const path = getConfigPath()
    if (existsSync(path)) {
      unlinkSync(path)
      log.info('Mail SMTP config cleared')
    }
  },

  async testConnection(config: MailSmtpConfig): Promise<MailTestResult> {
    try {
      const nodemailer = await import('nodemailer')
      const transport = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: false,
        auth: {
          user: config.senderEmail,
          pass: config.appPassword,
        },
        tls: {
          ciphers: 'SSLv3',
          rejectUnauthorized: config.useTls,
        },
        requireTLS: config.useTls,
      })

      await transport.verify()
      log.info(`SMTP connection test successful for ${config.senderEmail}`)
      return { success: true, message: 'Connection successful — credentials verified.' }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      log.warn(`SMTP connection test failed: ${message}`)
      return { success: false, message }
    }
  },
}
