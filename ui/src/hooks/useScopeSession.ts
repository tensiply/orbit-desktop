import { useCallback } from 'react'
import { useAppStore } from '../store'
import { scopePathFromSession } from '../domain/scope'
import type { Session } from '../types'

/**
 * Hook for launching a new session at the same scope as an existing session,
 * with a given engine. Packages the scope-path derivation + blur + launch.
 */
export function useScopeSession() {
  const launchScopeSession = useAppStore((s) => s.launchScopeSession)
  const blurSidebar        = useAppStore((s) => s.blurSidebar)

  const launchWithEngine = useCallback(
    (session: Session, engine: string) => {
      const path = scopePathFromSession(session)
      blurSidebar()
      void launchScopeSession(path, engine)
    },
    [launchScopeSession, blurSidebar],
  )

  return { launchWithEngine }
}
