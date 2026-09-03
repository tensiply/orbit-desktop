// Tracks when the user last typed into each PTY (by tab id). useSessionActivity
// uses this to tell engine output apart from keystroke echoes: output that lands
// right after the user typed is an echo, not the engine working.
const lastInput = new Map<string, number>()

export function markPtyInput(tabId: string): void {
  lastInput.set(tabId, Date.now())
}

export function lastPtyInputAt(tabId: string): number {
  return lastInput.get(tabId) ?? 0
}

export function clearPtyInput(tabId: string): void {
  lastInput.delete(tabId)
}
