import type { Session, ScopeArgs } from '../types'

/** ScopeArgs (workspace→repository) from a full scope path `[ws, tenant, project, repo]`. */
export function scopeArgsFromPath(fullPath: string[]): ScopeArgs {
  return {
    workspace:  fullPath[0] ?? null,
    tenant:     fullPath[1] ?? null,
    project:    fullPath[2] ?? null,
    repository: fullPath[3] ?? null,
  }
}

/**
 * Display level for a full scope path — matches `PluginInfo.enabled_here`
 * (`"repository"`, not the CLI's `"repo"`). `null` at the workspace-picker root.
 */
export function scopeDisplayLevel(fullPath: string[]): string | null {
  return [null, 'workspace', 'tenant', 'project', 'repository'][Math.min(fullPath.length, 4)]
}

/**
 * CLI `--scope` value for a full scope path (repository → `"repo"`). At the
 * root (no scope drilled) this is `"global"` — passed explicitly so the toggle
 * targets the global plugin file regardless of the daemon's cwd.
 */
export function scopeCliLevel(fullPath: string[]): string {
  return ['global', 'workspace', 'tenant', 'project', 'repo'][Math.min(fullPath.length, 4)]
}

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
