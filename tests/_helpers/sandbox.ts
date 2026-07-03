import { mkdtempSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { vi, afterEach } from 'vitest'

export interface TestSandbox {
  dir: string
  path: (...segments: string[]) => string
  cleanup: () => void
}

export function createSandbox(prefix = 'nexus-test-'): TestSandbox {
  const dir = mkdtempSync(join(tmpdir(), prefix))

  return {
    dir,
    path: (...segments: string[]) => join(dir, ...segments),
    cleanup: () => {
      if (existsSync(dir)) {
        rmSync(dir, { recursive: true, force: true })
      }
    },
  }
}

export function useSandbox(prefix = 'nexus-test-'): TestSandbox {
  const sandbox = createSandbox(prefix)

  afterEach(() => {
    sandbox.cleanup()
  })

  return sandbox
}

export function isolateModules(
  moduleFactory: () => Promise<unknown>,
  mocks?: Record<string, unknown>
) {
  if (mocks) {
    for (const [path, mock] of Object.entries(mocks)) {
      vi.doMock(path, () => mock)
    }
  }
  return moduleFactory()
}

export function createAbortableSignal(timeoutMs = 5000): {
  signal: AbortSignal
  abort: () => void
} {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  return {
    signal: controller.signal,
    abort: () => {
      clearTimeout(timer)
      controller.abort()
    },
  }
}
