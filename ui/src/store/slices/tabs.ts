import type { StateCreator } from 'zustand'
import type { Tab, Session, LaunchedInfo, NavView } from '../../types'
import { tauriService } from '../../services/tauri'
import { sendTerminalCmd } from '../../lib/terminalBus'
import { workspaceFromWorkDir } from '../../domain/scope'
import { sessionCache } from '../../infrastructure/storage/sessionCache'
import { FEATURE_PAGES, featurePageId } from '../../lib/featurePages'
import type { AppStore } from '../types'

export interface TabsSlice {
  tabs: Tab[]
  activeTabId: string | null
  archHistory: Array<{ workspace: string; tenant: string }>

  openShell: () => Promise<void>
  openSession: (session: Session) => Promise<void>
  openShortcuts: () => void
  openUIKit: () => void
  openColors: () => void
  openUIMap: () => void
  openSettings: () => void
  openFeaturePage: (view: NavView) => void
  openArchitecture: (workspace: string, tenant: string) => void
  closeTab: (tabId: string) => Promise<void>
  setActiveTab: (tabId: string) => void
  killSession: (session: Session) => Promise<void>
  duplicateSession: (session: Session) => Promise<void>
  restartSession: (session: Session) => Promise<void>
  launchScopeSession: (scopePath: string[], engine?: string) => Promise<void>
}

export const createTabsSlice: StateCreator<AppStore, [], [], TabsSlice> = (set, get) => {
  // Sync drawer state whenever the active tab changes.
  const syncActive = (tabId: string | null) => get().syncDrawerToTab(tabId)

  // Persist the current open-session list to localStorage so it can be restored on next launch.
  const saveOpenSessions = () => {
    const { tabs, activeTabId } = get()
    const ids = tabs.filter((t) => t.type === 'terminal' && t.sessionId).map((t) => t.sessionId!)
    sessionCache.setOpenSessions(ids)
    const activeSession = tabs.find((t) => t.id === activeTabId)?.sessionId ?? null
    sessionCache.setActiveSessionId(activeSession)
  }

  // Wire up PTY and tab state after a session has already been launched.
  const attachLaunchedSession = async (
    launched: LaunchedInfo,
    label: string | undefined,
    opts: { focusPanel?: boolean; markBlank?: boolean } = {},
  ): Promise<string> => {
    if (opts.markBlank) get().markSessionBlank(launched.session_id)
    const tabId = await tauriService.ptyOpen(launched.tmux_name)
    const tab: Tab = {
      id:          tabId,
      title:       label ?? '',
      type:        'terminal',
      sessionId:   launched.session_id,
      tmuxSession: launched.tmux_name,
    }
    sessionCache.setLastSession(launched.session_id)
    set((state) => ({
      tabs: [...state.tabs, tab],
      activeTabId: tabId,
      navView: 'terminal',
      ...(opts.focusPanel ? { focusedPanel: 'main' as const } : {}),
    }))
    saveOpenSessions()
    syncActive(tabId)
    return tabId
  }

  return {
    tabs: [],
    activeTabId: null,
    archHistory: [],

    openShell: async () => {
      const tabId = await tauriService.ptyOpen(null)
      const tab: Tab = { id: tabId, title: 'shell', type: 'terminal' }
      set((state) => ({ tabs: [...state.tabs, tab], activeTabId: tabId, navView: 'terminal' }))
      syncActive(tabId)
    },

    openSession: async (session: Session) => {
      const existing = get().tabs.find((t) => t.sessionId === session.id)
      if (existing) {
        sessionCache.setLastSession(session.id)
        set({ activeTabId: existing.id, navView: 'terminal', focusedPanel: 'main' })
        syncActive(existing.id)
        // Force DOM focus on the terminal — panel may already have been 'main'
        // so the panelFocused effect in TerminalPane wouldn't re-fire without this.
        requestAnimationFrame(() => sendTerminalCmd(existing.id, 'focus'))
        return
      }

      const label = session.repository || session.project || session.tenant

      if (session.is_history) {
        // History sessions have a dead tmux session — re-launch orbit at the same scope.
        const launched = await tauriService.sessionLaunch({
          workspace:   workspaceFromWorkDir(session.work_dir),
          tenant:      session.tenant     || null,
          project:     session.project    || null,
          repository:  session.repository || null,
          engine:      session.engine,
          new_session: true,
        })
        await attachLaunchedSession(launched, label, { markBlank: true, focusPanel: true })
        return
      }

      let tabId: string
      try {
        tabId = await tauriService.ptyOpen(session.tmux_session ?? null)
      } catch (err) {
        console.error('[orbit] ptyOpen failed for session', session.id, err)
        return
      }
      const tab: Tab = {
        id:          tabId,
        title:       label,
        type:        'terminal',
        sessionId:   session.id,
        tmuxSession: session.tmux_session,
      }
      sessionCache.setLastSession(session.id)
      set((state) => ({ tabs: [...state.tabs, tab], activeTabId: tabId, navView: 'terminal', focusedPanel: 'main' }))
      saveOpenSessions()
      syncActive(tabId)
    },

    openShortcuts: () => {
      const existing = get().tabs.find((t) => t.type === 'shortcuts')
      if (existing) { set({ activeTabId: existing.id }); syncActive(existing.id); return }
      const tab: Tab = { id: 'shortcuts', title: 'Shortcuts', type: 'shortcuts' }
      set((state) => ({ tabs: [...state.tabs, tab], activeTabId: 'shortcuts' }))
      syncActive('shortcuts')
    },

    openUIKit: () => {
      const existing = get().tabs.find((t) => t.type === 'uikit')
      if (existing) { set({ activeTabId: existing.id }); syncActive(existing.id); return }
      const tab: Tab = { id: 'uikit', title: 'UI Kit', type: 'uikit' }
      set((state) => ({ tabs: [...state.tabs, tab], activeTabId: 'uikit' }))
      syncActive('uikit')
    },

    openColors: () => {
      const existing = get().tabs.find((t) => t.type === 'colors')
      if (existing) { set({ activeTabId: existing.id }); syncActive(existing.id); return }
      const tab: Tab = { id: 'colors', title: 'Colors', type: 'colors' }
      set((state) => ({ tabs: [...state.tabs, tab], activeTabId: 'colors' }))
      syncActive('colors')
    },

    openFeaturePage: (view: NavView) => {
      const def = FEATURE_PAGES[view]
      if (!def) return
      const id = featurePageId(view)
      const existing = get().tabs.find((t) => t.id === id)
      if (existing) { set({ activeTabId: id }); syncActive(id); return }
      const tab: Tab = { id, title: def.title, type: 'feature-page', featureView: view }
      set((state) => ({ tabs: [...state.tabs, tab], activeTabId: id }))
      syncActive(id)
    },

    openUIMap: () => {
      const existing = get().tabs.find((t) => t.type === 'ui-map')
      if (existing) { set({ activeTabId: existing.id }); syncActive(existing.id); return }
      const tab: Tab = { id: 'ui-map', title: 'UI Map', type: 'ui-map' }
      set((state) => ({ tabs: [...state.tabs, tab], activeTabId: 'ui-map' }))
      syncActive('ui-map')
    },

    openSettings: () => {
      get().setNavView('settings')
    },

    openArchitecture: (workspace: string, tenant: string) => {
      const tabId = `arch-${workspace}-${tenant}`
      const existing = get().tabs.find((t) => t.id === tabId)
      const prev = get().archHistory.filter((h) => !(h.workspace === workspace && h.tenant === tenant))
      const archHistory = [{ workspace, tenant }, ...prev].slice(0, 10)
      if (existing) {
        set({ activeTabId: tabId, navView: 'architecture', archHistory })
        syncActive(tabId)
        return
      }
      const tab: Tab = {
        id: tabId,
        title: `${tenant} architecture`,
        type: 'architecture',
        archWorkspace: workspace,
        archTenant: tenant,
      }
      set((state) => ({ tabs: [...state.tabs, tab], activeTabId: tabId, navView: 'architecture', archHistory }))
      syncActive(tabId)
    },

    closeTab: async (tabId: string) => {
      const tab = get().tabs.find((t) => t.id === tabId)
      if (!tab) return
      if (tab.type === 'terminal' || tab.type == null) {
        await tauriService.ptyClose(tabId).catch(console.error)
      }
      await get().closeTabDrawer(tabId)
      set((state) => {
        const tabs = state.tabs.filter((t) => t.id !== tabId)
        let activeTabId = state.activeTabId
        if (activeTabId === tabId) {
          const idx = state.tabs.findIndex((t) => t.id === tabId)
          activeTabId = tabs[Math.max(0, idx - 1)]?.id ?? null
        }
        return { tabs, activeTabId }
      })
      saveOpenSessions()
      syncActive(get().activeTabId)
    },

    setActiveTab: (tabId: string) => {
      const tab = get().tabs.find((t) => t.id === tabId)
      if (tab?.sessionId) {
        sessionCache.setLastSession(tab.sessionId)
        sessionCache.setActiveSessionId(tab.sessionId)
      }
      const navView: NavView =
        tab?.type === 'document'     ? 'documents'    :
        tab?.type === 'architecture' ? 'architecture' :
        tab?.type === 'settings'     ? 'settings'     :
        tab?.type === 'task'         ? 'tasks'        :
        tab?.type === 'feature-page' ? (tab.featureView ?? 'tasks') :
                                       'terminal'
      set({ activeTabId: tabId, navView })
      syncActive(tabId)
    },

    killSession: async (session: Session) => {
      await tauriService.sessionKill(session.id).catch(console.error)
      const tab = get().tabs.find((t) => t.sessionId === session.id)
      if (tab) await get().closeTab(tab.id)
      await get().refreshSessions()
    },

    duplicateSession: async (session: Session) => {
      const launched = await tauriService.sessionLaunch({
        workspace:   workspaceFromWorkDir(session.work_dir),
        tenant:      session.tenant     || null,
        project:     session.project    || null,
        repository:  session.repository || null,
        engine:      session.engine,
        new_session: true,
      })
      const label = session.repository || session.project || session.tenant || 'shell'
      await attachLaunchedSession(launched, label)
      await get().refreshSessions()
    },

    launchScopeSession: async (scopePath: string[], engine = 'claude') => {
      const [workspace, tenant, project, repository] = scopePath
      const launched = await tauriService.sessionLaunch({
        workspace:   workspace   ?? null,
        tenant:      tenant      ?? null,
        project:     project     ?? null,
        repository:  repository  ?? null,
        engine,
        new_session: true,
      })
      const label = repository || project || tenant || workspace || 'shell'
      await attachLaunchedSession(launched, label, { markBlank: true, focusPanel: true })
      await get().refreshSessions()
    },

    restartSession: async (session: Session) => {
      await tauriService.sessionKill(session.id).catch(console.error)
      const tab = get().tabs.find((t) => t.sessionId === session.id)
      if (tab) {
        await tauriService.ptyClose(tab.id).catch(console.error)
        set((state) => {
          const tabs = state.tabs.filter((t) => t.id !== tab.id)
          const activeTabId = state.activeTabId === tab.id
            ? (tabs[0]?.id ?? null)
            : state.activeTabId
          return { tabs, activeTabId }
        })
        syncActive(get().activeTabId)
      }
      const launched = await tauriService.sessionLaunch({
        workspace:   workspaceFromWorkDir(session.work_dir),
        tenant:      session.tenant     || null,
        project:     session.project    || null,
        repository:  session.repository || null,
        engine:      session.engine,
        new_session: true,
      })
      const label = session.repository || session.project || session.tenant || 'shell'
      await attachLaunchedSession(launched, label)
      await get().refreshSessions()
    },
  }
}
