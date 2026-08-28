import type { Session } from '../types'

/**
 * Extracts the workspace name from a work_dir path of the form /home/<user>/<workspace>/...
 * Returns null for paths that don't follow this convention.
 */
export function workspaceFromWorkDir(workDir: string): string | null {
  const parts = workDir.split('/').filter(Boolean)
  return parts.length >= 3 && parts[0] === 'home' ? parts[2] : null
}

/** Builds the scope path string[] from a Session for use with launchScopeSession. */
export function scopePathFromSession(session: Session): string[] {
  const ws = workspaceFromWorkDir(session.work_dir)
  return [ws, session.tenant || null, session.project || null, session.repository || null]
    .filter(Boolean) as string[]
}
