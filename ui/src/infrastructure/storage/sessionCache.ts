const LAST_SESSION_KEY = 'orbit-last-session'

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
}
