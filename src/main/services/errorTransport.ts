import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import type { ErrorEntry, ErrorScope, ErrorSeverity, ErrorListResponse, ErrorNewEvent } from '../../shared/ipc-types'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { getMainWindow } from '../index'

const MAX_FILE_SIZE = 1024 * 1024
const MAX_ENTRIES_AFTER_ROTATION = 500

const fingerprintCache = new Map<string, ErrorEntry>()

export function getErrorsFilePath(): string {
  return path.join(app.getPath('userData'), 'errors.jsonl')
}

function generateFingerprint(scope: string, message: string): string {
  return crypto.createHash('sha256').update(`${scope}:${message}`).digest('hex').slice(0, 16)
}

function emitErrorToRenderer(entry: ErrorEntry): void {
  try {
    const win = getMainWindow()
    if (win && !win.isDestroyed()) {
      const payload: ErrorNewEvent = { entry }
      win.webContents.send(IPC_CHANNELS.ERRORS_NEW_EVENT, payload)
    }
  } catch { /* never crash */ }
}

function appendEntry(entry: ErrorEntry): void {
  try {
    const filePath = getErrorsFilePath()
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.appendFileSync(filePath, JSON.stringify(entry) + '\n')
  } catch { /* logging must never crash the app */ }
}

export function captureError(params: {
  message: string
  stack?: string
  componentStack?: string
  scope: ErrorScope
  source?: string
  severity?: ErrorSeverity
  url?: string
}): ErrorEntry {
  const fingerprint = generateFingerprint(params.scope, params.message)
  const now = new Date().toISOString()

  const existing = fingerprintCache.get(fingerprint)
  if (existing) {
    existing.occurrences++
    existing.lastOccurrence = now
    if (params.stack && !existing.stack) existing.stack = params.stack
    appendEntry(existing)
    emitErrorToRenderer(existing)
    return existing
  }

  const entry: ErrorEntry = {
    id: crypto.randomUUID(),
    timestamp: now,
    scope: params.scope,
    message: params.message,
    stack: params.stack,
    componentStack: params.componentStack,
    platform: process.platform,
    version: app.getVersion(),
    severity: params.severity ?? 'error',
    fingerprint,
    occurrences: 1,
    lastOccurrence: now,
    status: 'new',
    source: params.source,
    url: params.url,
  }

  fingerprintCache.set(fingerprint, entry)
  appendEntry(entry)
  emitErrorToRenderer(entry)

  return entry
}

export function readAllErrors(): ErrorListResponse {
  const filePath = getErrorsFilePath()

  if (!fs.existsSync(filePath)) {
    return { errors: [], totalCount: 0, fileSize: 0 }
  }

  try {
    const stat = fs.statSync(filePath)

    if (stat.size > MAX_FILE_SIZE) {
      rotateIfNeeded()
    }

    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.trim().split('\n').filter(Boolean)

    const byFingerprint = new Map<string, ErrorEntry>()
    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as ErrorEntry
        byFingerprint.set(entry.fingerprint, entry)
      } catch { /* skip malformed lines */ }
    }

    const errors = Array.from(byFingerprint.values())
      .sort((a, b) => new Date(b.lastOccurrence).getTime() - new Date(a.lastOccurrence).getTime())

    return {
      errors,
      totalCount: errors.length,
      fileSize: stat.size,
    }
  } catch {
    return { errors: [], totalCount: 0, fileSize: 0 }
  }
}

export function clearErrors(): void {
  try {
    const filePath = getErrorsFilePath()
    fs.writeFileSync(filePath, '')
    fingerprintCache.clear()
  } catch { /* never crash */ }
}

export function markReported(id: string): boolean {
  const filePath = getErrorsFilePath()

  if (!fs.existsSync(filePath)) return false

  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.trim().split('\n').filter(Boolean)

    const byFingerprint = new Map<string, ErrorEntry>()
    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as ErrorEntry
        byFingerprint.set(entry.fingerprint, entry)
      } catch { /* skip */ }
    }

    let found = false
    for (const entry of byFingerprint.values()) {
      if (entry.id === id) {
        entry.status = 'reported'
        found = true
        const cached = fingerprintCache.get(entry.fingerprint)
        if (cached) cached.status = 'reported'
        break
      }
    }

    if (found) {
      const newContent = Array.from(byFingerprint.values())
        .map(e => JSON.stringify(e))
        .join('\n') + '\n'
      fs.writeFileSync(filePath, newContent)
    }

    return found
  } catch {
    return false
  }
}

export function deleteError(id: string): boolean {
  const filePath = getErrorsFilePath()

  if (!fs.existsSync(filePath)) return false

  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.trim().split('\n').filter(Boolean)

    const entries: ErrorEntry[] = []
    const byFingerprint = new Map<string, ErrorEntry>()

    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as ErrorEntry
        byFingerprint.set(entry.fingerprint, entry)
      } catch { /* skip */ }
    }

    let found = false
    for (const entry of byFingerprint.values()) {
      if (entry.id === id) {
        found = true
        fingerprintCache.delete(entry.fingerprint)
      } else {
        entries.push(entry)
      }
    }

    if (found) {
      const newContent = entries.length > 0
        ? entries.map(e => JSON.stringify(e)).join('\n') + '\n'
        : ''
      fs.writeFileSync(filePath, newContent)
    }

    return found
  } catch {
    return false
  }
}

export function updateAiDescription(id: string, description: string): boolean {
  const filePath = getErrorsFilePath()

  if (!fs.existsSync(filePath)) return false

  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.trim().split('\n').filter(Boolean)

    const byFingerprint = new Map<string, ErrorEntry>()
    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as ErrorEntry
        byFingerprint.set(entry.fingerprint, entry)
      } catch { /* skip */ }
    }

    let found = false
    for (const entry of byFingerprint.values()) {
      if (entry.id === id) {
        entry.aiDescription = description
        found = true
        const cached = fingerprintCache.get(entry.fingerprint)
        if (cached) cached.aiDescription = description
        break
      }
    }

    if (found) {
      const newContent = Array.from(byFingerprint.values())
        .map(e => JSON.stringify(e))
        .join('\n') + '\n'
      fs.writeFileSync(filePath, newContent)
    }

    return found
  } catch {
    return false
  }
}

function rotateIfNeeded(): void {
  try {
    const filePath = getErrorsFilePath()
    if (!fs.existsSync(filePath)) return

    const stat = fs.statSync(filePath)
    if (stat.size <= MAX_FILE_SIZE) return

    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.trim().split('\n').filter(Boolean)

    const kept = lines.slice(-MAX_ENTRIES_AFTER_ROTATION)
    fs.writeFileSync(filePath, kept.join('\n') + '\n')
  } catch { /* never crash */ }
}

export function initErrorTransport(): void {
  try {
    const filePath = getErrorsFilePath()
    if (!fs.existsSync(filePath)) return

    const content = fs.readFileSync(filePath, 'utf-8')
    const firstLine = content.trim().split('\n')[0]
    if (!firstLine) return

    const entry = JSON.parse(firstLine) as ErrorEntry
    if (entry.version && entry.version !== app.getVersion()) {
      const oldPath = filePath.replace('.jsonl', '.old.jsonl')
      fs.renameSync(filePath, oldPath)
      fingerprintCache.clear()
    }
  } catch { /* never crash */ }
}
