const LAST_SESSION_KEY    = 'orbit-last-session'
const OPEN_SESSIONS_KEY   = 'orbit-open-sessions'
const ACTIVE_SESSION_KEY  = 'orbit-active-session'

export const sessionCache = {
  setLastSession(id: string): void {
    localStorage.setItem(LAST_SESSION_KEY, id)
  },

  getLastSession(): string | null {
    return localStorage.getItem(LAST_SESSION_KEY)
  },

  clearLastSession(): void {
    localStorage.removeItem(LAST_SESSION_KEY)
  },

  setOpenSessions(ids: string[]): void {
    localStorage.setItem(OPEN_SESSIONS_KEY, JSON.stringify(ids))
  },

  getOpenSessions(): string[] {
    try {
      return JSON.parse(localStorage.getItem(OPEN_SESSIONS_KEY) ?? '[]')
    } catch {
      return []
    }
  },

  setActiveSessionId(id: string | null): void {
    if (id) localStorage.setItem(ACTIVE_SESSION_KEY, id)
    else localStorage.removeItem(ACTIVE_SESSION_KEY)
  },

  getActiveSessionId(): string | null {
    return localStorage.getItem(ACTIVE_SESSION_KEY)
  },
}
