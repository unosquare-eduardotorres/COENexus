import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  timestamp: string
  level: LogLevel
  module: string
  message: string
  data?: Record<string, unknown>
  error?: { message: string; stack?: string }
  correlationId?: string
}

interface Logger {
  debug(msg: string, data?: Record<string, unknown>): void
  info(msg: string, data?: Record<string, unknown>): void
  warn(msg: string, data?: Record<string, unknown>): void
  error(msg: string, error?: Error, data?: Record<string, unknown>): void
}

const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 }
let minLevel: LogLevel = 'info'
let logDir: string | null = null

function getLogDir(): string | null {
  if (logDir !== null) return logDir
  try {
    logDir = app.getPath('logs')
    fs.mkdirSync(logDir, { recursive: true })
  } catch {
    logDir = ''
  }
  return logDir
}

function writeLog(entry: LogEntry): void {
  const line = JSON.stringify(entry)

  switch (entry.level) {
    case 'error': console.error(line); break
    case 'warn': console.warn(line); break
    case 'debug': console.debug(line); break
    default: console.log(line)
  }

  try {
    const dir = getLogDir()
    if (dir) {
      const logFile = path.join(dir, `nexus-${new Date().toISOString().slice(0, 10)}.log`)
      fs.appendFileSync(logFile, line + '\n')
    }
  } catch { /* logging must never crash the app */ }
}

function buildLogger(module: string, correlationId?: string): Logger {
  function log(level: LogLevel, msg: string, error?: Error, data?: Record<string, unknown>) {
    if (LEVELS[level] < LEVELS[minLevel]) return
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message: msg,
    }
    if (data) entry.data = data
    if (error) entry.error = { message: error.message, stack: error.stack }
    if (correlationId) entry.correlationId = correlationId
    writeLog(entry)
  }

  return {
    debug: (msg, data?) => log('debug', msg, undefined, data),
    info: (msg, data?) => log('info', msg, undefined, data),
    warn: (msg, data?) => log('warn', msg, undefined, data),
    error: (msg, err?, data?) => log('error', msg, err, data),
  }
}

export function createLogger(module: string): Logger {
  return buildLogger(module)
}
