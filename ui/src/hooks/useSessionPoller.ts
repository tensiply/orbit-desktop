import { useEffect } from 'react'
import { useAppStore } from '../store'
import { sessionCache } from '../infrastructure/storage/sessionCache'
import type { Session } from '../types'

export function useSessionPoller(intervalMs: number) {
  const refreshSessions = useAppStore((s) => s.refreshSessions)

  useEffect(() => {
    void refreshSessions().then(async () => {
      const { sessions, openSession } = useAppStore.getState()
      const openIds  = sessionCache.getOpenSessions()
      const activeId = sessionCache.getActiveSessionId()

      if (openIds.length > 0) {
        // Restore all previously open terminal sessions in saved order.
        // Open the active one last so it ends up as the focused tab.
        const live = (id: string) => sessions.find((s) => !s.is_history && s.id === id)
        const nonActive: Session[] = openIds.filter((id) => id !== activeId).map(live).filter(Boolean) as Session[]
        const active = activeId ? live(activeId) : undefined

        for (const s of nonActive) await openSession(s)
        if (active) await openSession(active)
      } else {
        // Legacy fallback: restore only the last session for users without saved open-sessions.
        const lastId = sessionCache.getLastSession()
        if (!lastId) return
        const target = sessions.find((s) => !s.is_history && s.id === lastId)
        if (target) void openSession(target)
      }
    })
    const id = setInterval(() => void refreshSessions(), intervalMs)
    return () => clearInterval(id)
    // refreshSessions is a stable Zustand action — intentional empty dep array
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
