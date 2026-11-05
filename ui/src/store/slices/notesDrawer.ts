import type { StateCreator } from 'zustand'
import type { ScopeArgs } from '../../types'
import type { AppStore } from '../types'
import { workspaceFromWorkDir } from '../../domain/scope'

/** Scope for a main tab — from its session, or the selected workspace as fallback. */
function scopeForTab(s: AppStore, tabId: string | null): ScopeArgs {
  const tab = tabId ? s.tabs.find((t) => t.id === tabId) : undefined
  const session = tab?.sessionId ? s.sessions.find((ss) => ss.id === tab.sessionId) : undefined
  return session
    ? {
        workspace:  workspaceFromWorkDir(session.work_dir),
        tenant:     session.tenant     || null,
        project:    session.project    || null,
        repository: session.repository || null,
      }
    : { workspace: s.selectedWorkspace ?? null, tenant: null, project: null, repository: null }
}

export interface NotesDrawerSlice {
  notesDrawerOpen:  boolean
  /** Scope whose source-of-truth/notes/ the drawer reads/writes. */
  notesDrawerScope: ScopeArgs | null
  /** Per-tab open state — mirrors the terminal drawer's `tabDrawers`. */
  notesDrawerTabs:  Record<string, boolean>

  openNotesDrawer:      () => void
  closeNotesDrawer:     () => void
  toggleNotesDrawer:    () => void
  /** Sync open state + scope to the given tab (called on active-tab change). */
  syncNotesDrawerToTab: (tabId: string | null) => void
}

export const createNotesDrawerSlice: StateCreator<AppStore, [], [], NotesDrawerSlice> = (set, get) => ({
  notesDrawerOpen:  false,
  notesDrawerScope: null,
  notesDrawerTabs:  {},

  openNotesDrawer: () => {
    // Single right-docked drawer at a time — mirror the other drawers.
    get().closeHarnessDrawer()
    get().closeArchDrawer()
    get().closePipelineDrawer()
    get().closeExecutionDrawer()
    get().closeDrawer()

    const s = get()
    const tabId = s.activeTabId
    const scope = scopeForTab(s, tabId)
    set((st) => ({
      notesDrawerOpen:  true,
      notesDrawerScope: scope,
      notesDrawerTabs:  tabId ? { ...st.notesDrawerTabs, [tabId]: true } : st.notesDrawerTabs,
    }))
  },

  closeNotesDrawer: () => {
    const tabId = get().activeTabId
    set((st) => ({
      notesDrawerOpen: false,
      notesDrawerTabs: tabId ? { ...st.notesDrawerTabs, [tabId]: false } : st.notesDrawerTabs,
    }))
  },

  toggleNotesDrawer: () => {
    if (get().notesDrawerOpen) get().closeNotesDrawer()
    else get().openNotesDrawer()
  },

  syncNotesDrawerToTab: (tabId) => {
    const open = tabId ? (get().notesDrawerTabs[tabId] ?? false) : false
    if (!open) {
      set({ notesDrawerOpen: false })
      return
    }
    set({ notesDrawerOpen: true, notesDrawerScope: scopeForTab(get(), tabId) })
  },
})
