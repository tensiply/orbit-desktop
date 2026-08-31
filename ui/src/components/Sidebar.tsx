import { useEffect } from 'react'
import { Loader2, BookOpen, User, Settings2, Monitor, Terminal as TerminalIcon, Cpu, ShieldCheck, Download, Package, Keyboard } from 'lucide-react'
import { useAppStore } from '../store'
import { workspaceFromWorkDir } from '../domain/scope'
import { useScopeSession } from '../hooks/useScopeSession'
import {
  computeSidebarItems,
  filterSessionsByScope,
  filterFilesByScope,
  filterTasksByScope,
} from '../lib/sidebarNav'
import { mergeFiles } from '../store/slices/documents'
import {
  SidebarProvider,
  SidebarMenu,
} from './ui/sidebar'
import { Separator } from './ui/separator'
import {
  PANEL_LABELS,
  NAV_ITEMS,
  BOTTOM_NAV_ITEMS,
  RailButton,
  SettingsRailButton,
} from './sidebar/Rail'
import { ViewModeToggle, ScopeNavigator } from './sidebar/ScopePanel'
import { SessionList } from './sidebar/SessionPanel'
import { FilesPanel, DocsPanel } from './sidebar/DocumentPanel'
import { ArchItemsList } from './sidebar/ArchPanel'
import { TasksPanel } from './sidebar/TaskPanel'
import type { ActiveSettingsCategory } from '../store/slices/settings'
import type { UpdateCheck, SetupStatus } from '../types'

const RAIL_W = 52

// ── Settings category groups ───────────────────────────────────────────────────

type SettingsCatItem = {
  id: ActiveSettingsCategory
  label: string
  icon: React.ReactNode
}

const SETTINGS_GROUPS: { items: SettingsCatItem[] }[] = [
  {
    items: [
      { id: 'general',    label: 'General',    icon: <Settings2 size={13} /> },
      { id: 'appearance', label: 'Appearance', icon: <Monitor size={13} />   },
      { id: 'terminal',   label: 'Terminal',   icon: <TerminalIcon size={13} /> },
    ],
  },
  {
    items: [
      { id: 'engine',  label: 'Engine',  icon: <Cpu size={13} /> },
    ],
  },
  {
    items: [
      { id: 'privacy',   label: 'Privacy',   icon: <ShieldCheck size={13} /> },
      { id: 'shortcuts', label: 'Shortcuts', icon: <Keyboard size={13} />   },
      { id: 'updates',   label: 'Updates',   icon: <Download size={13} />   },
    ],
  },
]

function SettingsCategoryPanel({
  active,
  onSelect,
  updateCheck,
  setupStatus,
  onOpenSetup,
}: {
  active: ActiveSettingsCategory
  onSelect: (cat: ActiveSettingsCategory) => void
  updateCheck: UpdateCheck | null
  setupStatus: SetupStatus | null
  onOpenSetup: () => void
}) {
  const updatesAvailable = updateCheck
    ? (updateCheck.cli.has_update || updateCheck.desktop.has_update)
    : false
  const setupIncomplete = setupStatus !== null && (!setupStatus.cli_installed || !setupStatus.has_workspaces)

  return (
    <div className="flex flex-col pt-1">
      {SETTINGS_GROUPS.map((group, gi) => (
        <div key={gi}>
          {group.items.map((cat) => {
            const showDot = cat.id === 'updates' && updatesAvailable
            const isActive = cat.id === active
            return (
              <button
                key={cat.id}
                onClick={() => onSelect(cat.id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors text-left ${
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                    : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                }`}
              >
                <span className={isActive ? 'text-sidebar-accent-foreground/70' : 'text-sidebar-foreground/35'}>
                  {cat.icon}
                </span>
                <span className="flex-1">{cat.label}</span>
                {showDot && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                )}
              </button>
            )
          })}
        </div>
      ))}

      <div className="mt-2 pt-2 border-t border-sidebar-border/40">
        <button
          onClick={onOpenSetup}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors text-left text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
        >
          <span className="text-sidebar-foreground/35">
            <Package size={13} />
          </span>
          <span className="flex-1">Setup Orbit</span>
          {setupIncomplete && (
            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
          )}
        </button>
      </div>
    </div>
  )
}

export function Sidebar({ width, collapsed }: { width: number; collapsed?: boolean }) {
  const allSessions       = useAppStore((s) => s.sessions)
  const selectedWorkspace = useAppStore((s) => s.selectedWorkspace)
  const sessionsLoading   = useAppStore((s) => s.sessionsLoading)
  const sessions = selectedWorkspace
    ? allSessions.filter((s) => workspaceFromWorkDir(s.work_dir) === selectedWorkspace)
    : allSessions
  const sessionTitles      = useAppStore((s) => s.sessionTitles)
  const blankSessions      = useAppStore((s) => s.blankSessions)
  const navView            = useAppStore((s) => s.navView)
  const openSession        = useAppStore((s) => s.openSession)
  const openArchitecture   = useAppStore((s) => s.openArchitecture)
  const setNavView         = useAppStore((s) => s.setNavView)
  const tabs               = useAppStore((s) => s.tabs)
  const activeTabId        = useAppStore((s) => s.activeTabId)
  const killSession        = useAppStore((s) => s.killSession)
  const duplicateSession   = useAppStore((s) => s.duplicateSession)
  const restartSession     = useAppStore((s) => s.restartSession)
  const sidebarFocused     = useAppStore((s) => s.sidebarFocused)
  const sidebarSelectedIdx = useAppStore((s) => s.sidebarSelectedIdx)
  const blurSidebar        = useAppStore((s) => s.blurSidebar)
  const documents          = useAppStore((s) => s.documents)
  const documentsLoading   = useAppStore((s) => s.documentsLoading)
  const images             = useAppStore((s) => s.images)
  const imagesLoading      = useAppStore((s) => s.imagesLoading)
  const svgs               = useAppStore((s) => s.svgs)
  const svgsLoading        = useAppStore((s) => s.svgsLoading)
  const fetchFiles         = useAppStore((s) => s.fetchFiles)
  const openDocument       = useAppStore((s) => s.openDocument)
  const openImage          = useAppStore((s) => s.openImage)
  const openSvg            = useAppStore((s) => s.openSvg)
  const tasks                = useAppStore((s) => s.tasks)
  const tasksLoading         = useAppStore((s) => s.tasksLoading)
  const fetchTasks           = useAppStore((s) => s.fetchTasks)
  const openTask             = useAppStore((s) => s.openTask)
  const openFeaturePage      = useAppStore((s) => s.openFeaturePage)
  const registeredWorkspaces = useAppStore((s) => s.registeredWorkspaces)
  const scopeViewMode          = useAppStore((s) => s.scopeViewMode)
  const setScopeViewMode       = useAppStore((s) => s.setScopeViewMode)
  const scopePath              = useAppStore((s) => s.scopePath)
  const setScopePath           = useAppStore((s) => s.setScopePath)
  const scopeTree              = useAppStore((s) => s.scopeTree)
  const loadScopeTree          = useAppStore((s) => s.loadScopeTree)
  const archHistory            = useAppStore((s) => s.archHistory)
  const activeSettingsCategory = useAppStore((s) => s.activeSettingsCategory)
  const setSettingsCategory    = useAppStore((s) => s.setSettingsCategory)
  const updateCheck            = useAppStore((s) => s.updateCheck)
  const setupStatus            = useAppStore((s) => s.setupStatus)
  const openSetupWizard        = useAppStore((s) => s.openSetupWizard)

  const { launchWithEngine } = useScopeSession()

  useEffect(() => {
    if (navView === 'documents') void fetchFiles()
  }, [navView])

  const taskWorkspace = selectedWorkspace
    ?? registeredWorkspaces.find((w) => w.is_default)?.name
    ?? registeredWorkspaces[0]?.name
    ?? ''

  useEffect(() => {
    if (navView === 'tasks' && taskWorkspace) {
      void fetchTasks(taskWorkspace)
      openFeaturePage('tasks')
    }
  }, [navView, taskWorkspace])

  useEffect(() => {
    if (scopeViewMode === 'scope') void loadScopeTree()
  }, [scopeViewMode])

  // Reset history mode when leaving terminal view
  useEffect(() => {
    if (navView !== 'terminal' && scopeViewMode === 'history') {
      setScopeViewMode('all')
    }
  }, [navView])

  // Reset drill-down path when workspace selection changes
  useEffect(() => {
    setScopePath([])
  }, [selectedWorkspace])

  const allFiles        = mergeFiles(documents, images, svgs)
  const filesLoading    = documentsLoading || imagesLoading || svgsLoading

  const activeSessionId = tabs.find((t) => t.id === activeTabId)?.sessionId
  const panelLabel      = PANEL_LABELS[navView] ?? navView
  const inScopeMode     = scopeViewMode === 'scope'
  const inHistoryMode   = scopeViewMode === 'history'

  // In history mode: only history sessions. In all/scope mode: only active sessions.
  const visibleSessions = inHistoryMode
    ? sessions.filter((s) => !!s.is_history)
    : sessions.filter((s) => !s.is_history)
  const scopedSessions  = inScopeMode ? filterSessionsByScope(visibleSessions, scopePath, selectedWorkspace) : visibleSessions
  const scopedFiles     = filterFilesByScope(allFiles, inScopeMode ? scopePath : [], selectedWorkspace)
  const scopedTasks     = filterTasksByScope(tasks, inScopeMode ? scopePath : [], selectedWorkspace)
  const hasScopeFilter  = navView === 'terminal' || navView === 'documents' || navView === 'architecture' || navView === 'tasks'

  // Compute unified items list to derive per-component selection state
  const sidebarItems = hasScopeFilter
    ? computeSidebarItems({ navView, scopeViewMode, scopePath, scopeTree, sessions: visibleSessions, documents, files: allFiles, selectedWorkspace: selectedWorkspace ?? null, archHistory })
    : []
  const selectedItem = sidebarFocused ? sidebarItems[sidebarSelectedIdx] : null

  // Scope navigator selection
  const backSelected       = selectedItem?.type === 'scope-back'
  const selectedFolderName = selectedItem?.type === 'scope-folder' ? selectedItem.name : null

  // Session/file list: adjust index relative to where sessions/files start in the flat list
  const sessionOffset      = sidebarItems.findIndex((i) => i.type === 'session')
  const fileOffset         = sidebarItems.findIndex((i) => i.type === 'file')
  const sessionRelativeIdx = sessionOffset >= 0 ? sidebarSelectedIdx - sessionOffset : -1
  const fileRelativeIdx    = fileOffset >= 0 ? sidebarSelectedIdx - fileOffset : -1
  const archOffset         = sidebarItems.findIndex((i) => i.type === 'scope-architecture')
  const archRelativeIdx    = archOffset >= 0 ? sidebarSelectedIdx - archOffset : -1

  return (
    <SidebarProvider open={false} onOpenChange={() => {}} className="contents">
      <aside
        data-orbit-zone="orbit.desktop.sidebar"
        style={collapsed ? undefined : { width, minWidth: width }}
        className="flex flex-col shrink-0 select-none bg-sidebar pl-2 pt-0 pb-2"
      >
        {/* Header */}
        <div data-tauri-drag-region data-orbit-zone="orbit.desktop.sidebar.header" className="h-10 flex items-center px-3 shrink-0">
          <span className="text-sm font-semibold text-sidebar-foreground tracking-tight">orbit</span>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Icon rail */}
          <div
            data-orbit-zone="orbit.desktop.sidebar.rail"
            className="flex flex-col items-center py-2 px-1.5 gap-0.5 shrink-0 rounded-2xl ring-1 ring-sidebar-border/80 bg-card"
            style={{ width: RAIL_W }}
          >
            <SidebarMenu className="w-full">
              {NAV_ITEMS.map((item) => (
                <RailButton
                  key={item.view}
                  item={item}
                  active={navView === item.view}
                  onClick={() => setNavView(item.view)}
                />
              ))}
            </SidebarMenu>
            <div className="mt-auto flex flex-col gap-0.5 pt-1 w-full">
              <SidebarMenu className="w-full">
                {BOTTOM_NAV_ITEMS.map((item) => (
                  <RailButton
                    key={item.view}
                    item={item}
                    active={navView === item.view}
                    onClick={() => setNavView(item.view)}
                  />
                ))}
                <RailButton
                  item={{ label: 'Documentation', view: 'docs', icon: <BookOpen /> }}
                  active={navView === 'docs'}
                  onClick={() => setNavView('docs')}
                />
                <Separator className="mx-1 w-auto my-0.5 bg-sidebar-border" />
                <SettingsRailButton />
                <RailButton
                  item={{ label: 'Profile', view: 'profile', icon: <User /> }}
                  active={navView === 'profile'}
                  onClick={() => setNavView('profile')}
                />
              </SidebarMenu>
            </div>
          </div>

          {/* Panel */}
          {!collapsed && (
            <div data-orbit-zone="orbit.desktop.sidebar.panel" className="flex flex-col flex-1 min-h-0 min-w-0">
              {/* Panel header */}
              <div data-orbit-zone="orbit.desktop.sidebar.panel.header" className="flex items-center pt-3 pb-1 pl-3 pr-2 shrink-0 gap-2">
                <span className="text-[10px] font-medium text-sidebar-foreground/40 uppercase tracking-wider flex-1">
                  {panelLabel}
                </span>
                {hasScopeFilter && <ViewModeToggle />}
                {sessionsLoading && navView === 'terminal' && (
                  <Loader2 className="h-3 w-3 animate-spin text-sidebar-foreground/30 shrink-0" />
                )}
                {filesLoading && navView === 'documents' && (
                  <Loader2 className="h-3 w-3 animate-spin text-sidebar-foreground/30 shrink-0" />
                )}
                {tasksLoading && navView === 'tasks' && (
                  <Loader2 className="h-3 w-3 animate-spin text-sidebar-foreground/30 shrink-0" />
                )}
              </div>

              {/* Panel content */}
              <div data-orbit-zone="orbit.desktop.sidebar.panel.content" className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 pl-3 pr-2 no-scrollbar">
                {navView === 'terminal' && (
                  <>
                    {inScopeMode && (
                      <ScopeNavigator
                        backSelected={backSelected}
                        selectedFolderName={selectedFolderName}
                      />
                    )}
                    <SessionList
                      sessions={scopedSessions}
                      sessionsLoading={sessionsLoading}
                      activeSessionId={activeSessionId}
                      sessionTitles={sessionTitles}
                      blankSessions={blankSessions}
                      sidebarFocused={sidebarFocused}
                      sidebarSelectedIdx={sessionRelativeIdx}
                      onOpen={(s) => { blurSidebar(); void openSession(s) }}
                      onKill={(s) => void killSession(s)}
                      onDuplicate={(s) => void duplicateSession(s)}
                      onRestart={(s) => void restartSession(s)}
                      onLaunchWithEngine={launchWithEngine}
                    />
                  </>
                )}

                {navView === 'docs' && <DocsPanel />}
                {navView === 'documents' && (
                  <>
                    {inScopeMode && (
                      <ScopeNavigator
                        backSelected={backSelected}
                        selectedFolderName={selectedFolderName}
                      />
                    )}
                    <FilesPanel
                      files={scopedFiles}
                      loading={filesLoading}
                      sidebarFocused={sidebarFocused}
                      sidebarSelectedIdx={fileRelativeIdx}
                      onOpen={(file) => {
                        blurSidebar()
                        if (file.kind === 'doc')   openDocument(file)
                        else if (file.kind === 'image') openImage(file)
                        else openSvg(file)
                      }}
                    />
                  </>
                )}
                {navView === 'architecture' && (
                  <>
                    {inScopeMode && (
                      <ScopeNavigator
                        backSelected={backSelected}
                        selectedFolderName={selectedFolderName}
                      />
                    )}
                    {!inScopeMode && (
                      <div className="px-2 pt-0.5 pb-0.5">
                        <span className="text-[9px] text-sidebar-foreground/20 uppercase tracking-wider">Recent</span>
                      </div>
                    )}
                    <ArchItemsList
                      items={sidebarItems.filter((i): i is { type: 'scope-architecture'; workspace: string; tenant: string } => i.type === 'scope-architecture')}
                      sidebarFocused={sidebarFocused}
                      sidebarSelectedIdx={archRelativeIdx}
                      onOpen={(ws, t) => { blurSidebar(); openArchitecture(ws, t) }}
                    />
                    {!inScopeMode && sidebarItems.filter((i) => i.type === 'scope-architecture').length === 0 && (
                      <p className="text-[10px] text-sidebar-foreground/25 px-2 pt-1 italic">No architectures opened yet</p>
                    )}
                  </>
                )}
                {navView === 'tasks' && taskWorkspace && (
                  <>
                    {inScopeMode && (
                      <ScopeNavigator
                        backSelected={backSelected}
                        selectedFolderName={selectedFolderName}
                      />
                    )}
                    <TasksPanel
                      tasks={scopedTasks}
                      loading={tasksLoading}
                      workspace={taskWorkspace}
                      sidebarFocused={sidebarFocused}
                      sidebarSelectedIdx={sidebarSelectedIdx}
                      onOpen={(t) => { blurSidebar(); openTask(t) }}
                    />
                  </>
                )}
                {navView === 'settings' && (
                  <SettingsCategoryPanel
                    active={activeSettingsCategory}
                    onSelect={setSettingsCategory}
                    updateCheck={updateCheck}
                    setupStatus={setupStatus}
                    onOpenSetup={openSetupWizard}
                  />
                )}
                {navView !== 'terminal' && navView !== 'docs' && navView !== 'documents' && navView !== 'architecture' && navView !== 'tasks' && navView !== 'settings' && (
                  <p className="text-[10px] text-sidebar-foreground/25 px-2 pt-1">Coming soon</p>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>
    </SidebarProvider>
  )
}
