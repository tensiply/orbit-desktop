import type { StateCreator } from 'zustand'
import type { SessionStatus } from '../../types'
import { eventBus } from '../../lib/eventBus'
import type { AppStore } from '../types'

// Runtime session status, derived from PTY activity by useSessionActivity.
// Lives in its own map (keyed by session id) rather than on the Session object,
// so the 5s refreshSessions() poll doesn't wipe it. Queryable from anywhere via
// useAppStore(...) or useAppStore.getState().sessionStatus.
export interface SessionStatusSlice {
  sessionStatus: Record<string, SessionStatus>

  /** Set a session's status. Emits `session:status-changed` only on an actual change. */
  setSessionStatus: (sessionId: string, status: SessionStatus) => void
  /** Drop status entries for sessions that no longer exist. */
  pruneSessionStatus: (aliveIds: string[]) => void
}

export const createSessionStatusSlice: StateCreator<AppStore, [], [], SessionStatusSlice> = (set, get) => ({
  sessionStatus: {},

  setSessionStatus: (sessionId, status) => {
    const from = get().sessionStatus[sessionId]
    if (from === status) return
    set((s) => ({ sessionStatus: { ...s.sessionStatus, [sessionId]: status } }))
    eventBus.emit('session:status-changed', { sessionId, from, to: status, at: Date.now() })
  },

  pruneSessionStatus: (aliveIds) => {
    const alive = new Set(aliveIds)
    const current = get().sessionStatus
    const next: Record<string, SessionStatus> = {}
    let changed = false
    for (const [id, status] of Object.entries(current)) {
      if (alive.has(id)) next[id] = status
      else changed = true
    }
    if (changed) set({ sessionStatus: next })
  },
})
