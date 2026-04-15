let cachedVigilToken = ''

export function setVigilToken(token: string): void {
  const trimmed = token.trim()
  if (!trimmed) return
  cachedVigilToken = trimmed
}

export function getVigilToken(): string {
  if (cachedVigilToken) {
    return cachedVigilToken
  }

  return process.env.VIGIL_SYNC_TOKEN?.trim() ?? ''
}
