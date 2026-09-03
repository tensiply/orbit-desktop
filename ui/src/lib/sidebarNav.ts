import type { Session, DocEntry, AnyFileEntry, OrbitTask, ScopeTreeWorkspace } from '../types'
import { workspaceFromWorkDir } from '../domain/scope'
export { workspaceFromWorkDir } from '../domain/scope'

// ── Item types ────────────────────────────────────────────────────────────────

export type SidebarNavItem =
  | { type: 'scope-back' }
  | { type: 'scope-folder'; name: string }
  | { type: 'session'; session: Session }
  | { type: 'document'; doc: DocEntry }
  | { type: 'file'; file: AnyFileEntry }
  | { type: 'task'; task: OrbitTask }

// When selectedWorkspace is set, path is relative (starts at tenant).
// Compute the full [workspace, tenant, project, repo] path for lookups.
function effectivePath(path: string[], selectedWorkspace: string | null | undefined): string[] {
  return selectedWorkspace ? [selectedWorkspace, ...path] : path
}

export function getScopeChildren(
  tree: ScopeTreeWorkspace[],
  path: string[],
  selectedWorkspace?: string | null,
): string[] {
  const ep = effectivePath(path, selectedWorkspace)
  if (ep.length === 0) return tree.map((w) => w.name)
  const ws = tree.find((w) => w.name === ep[0])
  if (!ws) return []
  if (ep.length === 1) return ws.tenants.map((t) => t.name)
  const tenant = ws.tenants.find((t) => t.name === ep[1])
  if (!tenant) return []
  if (ep.length === 2) return tenant.projects.map((p) => p.name)
  const project = tenant.projects.find((p) => p.name === ep[2])
  if (!project) return []
  if (ep.length === 3) return project.repositories.map((r) => r.name)
  return []
}

export function filterSessionsByScope(
  sessions: Session[],
  path: string[],
  selectedWorkspace?: string | null,
): Session[] {
  const ep = effectivePath(path, selectedWorkspace)
  if (ep.length === 0) return sessions
  return sessions.filter((s) => {
    if (ep[0] && workspaceFromWorkDir(s.work_dir) !== ep[0]) return false
    if (ep[1] && s.tenant     !== ep[1]) return false
    if (ep[2] && s.project    !== ep[2]) return false
    if (ep[3] && s.repository !== ep[3]) return false
    return true
  })
}

export function filterDocsByScope(
  docs: DocEntry[],
  path: string[],
  selectedWorkspace?: string | null,
): DocEntry[] {
  const ep = effectivePath(path, selectedWorkspace)
  if (ep.length === 0) return docs
  return docs.filter((d) => {
    if (ep[0] && d.workspace  !== ep[0]) return false
    if (ep[1] && d.tenant     !== ep[1]) return false
    if (ep[2] && d.project    !== ep[2]) return false
    if (ep[3] && d.repository !== ep[3]) return false
    return true
  })
}

export function filterFilesByScope(
  files: AnyFileEntry[],
  path: string[],
  selectedWorkspace?: string | null,
): AnyFileEntry[] {
  const ep = effectivePath(path, selectedWorkspace)
  if (ep.length === 0) return files
  return files.filter((f) => {
    if (ep[0] && f.workspace  !== ep[0]) return false
    if (ep[1] && f.tenant     !== ep[1]) return false
    if (ep[2] && f.project    !== ep[2]) return false
    if (ep[3] && f.repository !== ep[3]) return false
    return true
  })
}

export function filterTasksByScope(
  tasks: OrbitTask[],
  path: string[],
  selectedWorkspace?: string | null,
): OrbitTask[] {
  const ep = effectivePath(path, selectedWorkspace)
  if (ep.length === 0) return tasks
  return tasks.filter((t) => {
    if (ep[0] && t.workspace  !== ep[0]) return false
    if (ep[1] && t.tenant     !== ep[1]) return false
    if (ep[2] && t.project    !== ep[2]) return false
    if (ep[3] && t.repository !== ep[3]) return false
    return true
  })
}

const MAX_SIDEBAR_SESSIONS = 10

export function visibleSessionsFromList(sessions: Session[]): Session[] {
  const nonHistory   = sessions.filter((s) => !s.is_history)
  const historySlots = Math.max(0, MAX_SIDEBAR_SESSIONS - nonHistory.length)
  const history      = sessions.filter((s) => !!s.is_history).slice(0, historySlots)
  return [...nonHistory, ...history]
}

// ── Unified item list ─────────────────────────────────────────────────────────

export function computeSidebarItems(params: {
  navView:           string
  scopeViewMode:     'all' | 'scope' | 'history'
  scopePath:         string[]
  scopeTree:         ScopeTreeWorkspace[]
  sessions:          Session[]
  documents:         DocEntry[]
  files:             AnyFileEntry[]
  selectedWorkspace: string | null
}): SidebarNavItem[] {
  const { navView, scopeViewMode, scopePath, scopeTree, sessions, documents, files, selectedWorkspace } = params

  const items: SidebarNavItem[] = []

  if (navView !== 'terminal' && navView !== 'documents') return []

  // ── Sessions / Documents / Files ───────────────────────────────────────────

  // Scope navigator
  if (scopeViewMode === 'scope') {
    if (scopePath.length > 0) {
      items.push({ type: 'scope-back' })
    }
    const children = getScopeChildren(scopeTree, scopePath, selectedWorkspace)
    for (const name of children) {
      items.push({ type: 'scope-folder', name })
    }
  }

  // Resource items
  const scopedPath = scopeViewMode === 'scope' ? scopePath : []
  if (navView === 'terminal') {
    for (const s of visibleSessionsFromList(filterSessionsByScope(sessions, scopedPath, selectedWorkspace))) {
      items.push({ type: 'session', session: s })
    }
  } else {
    for (const file of filterFilesByScope(files, scopedPath, selectedWorkspace)) {
      items.push({ type: 'file', file })
    }
  }

  return items
}
