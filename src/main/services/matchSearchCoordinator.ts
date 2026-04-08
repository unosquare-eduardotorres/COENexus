interface PendingConfirmation {
  resolve: (action: string) => void
  reject: (reason: Error) => void
}

const pending = new Map<string, PendingConfirmation>()

export const matchSearchCoordinator = {
  tryResolve(searchId: string, action: string): boolean {
    const entry = pending.get(searchId)
    if (!entry) return false
    pending.delete(searchId)
    entry.resolve(action)
    return true
  },

  tryResolveAll(action: string): void {
    for (const [key, entry] of pending) {
      pending.delete(key)
      entry.resolve(action)
    }
  },

}
