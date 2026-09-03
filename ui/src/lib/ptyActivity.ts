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

// Tracks when the frontend last resized each PTY (by tab id). A resize sends
// SIGWINCH to the engine, which makes full-screen TUIs (claude, gemini, opencode)
// repaint the whole screen — a burst of output that looks identical to the engine
// working. useSessionActivity uses this to ignore that repaint so merely entering
// a tab, toggling the sidebar, or resizing the window doesn't flip a session to
// working/done.
const lastResize = new Map<string, number>()

export function markPtyResize(tabId: string): void {
  lastResize.set(tabId, Date.now())
}

export function lastPtyResizeAt(tabId: string): number {
  return lastResize.get(tabId) ?? 0
}

export function clearPtyResize(tabId: string): void {
  lastResize.delete(tabId)
}
