import type { ErrorScope } from '../../../../shared/ipc-types'

export function reportError(
  err: unknown,
  scope: ErrorScope = 'Renderer',
): string {
  const message = err instanceof Error ? err.message : String(err)
  const stack = err instanceof Error ? err.stack : undefined

  try {
    window.api?.bug?.report({
      message,
      stack,
      scope,
      url: window.location.hash,
    })
  } catch { /* never crash the caller */ }

  return message
}
