import { useRef, useEffect } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { invoke } from '@tauri-apps/api/core'
import { Bug, RefreshCw, TerminalSquare } from 'lucide-react'
import { useAppStore } from './store'
import { TerminalPane } from './components/Terminal'
import { TabBar } from './components/TabBar'
import { Sidebar } from './components/Sidebar'
import { TitleBar } from './components/TitleBar'
import { ShortcutsView } from './components/ShortcutsView'
import { TerminalDrawer } from './components/TerminalDrawer'
import { ArchEditDrawer } from './components/ArchEditDrawer'
import { HarnessDrawer } from './components/HarnessDrawer'
import { UIKitView } from './components/UIKitView'
import { ColorsView } from './components/ColorsView'
import { SettingsView } from './components/SettingsView'
import { DocumentView } from './components/DocumentView'
import { ArchitectureView } from './components/ArchitectureView'
import { DesktopUIView } from './components/DesktopUIView'
import { SessionHeader } from './components/SessionHeader'
import { LaunchPickerModal } from './components/LaunchPickerModal'
import { InstallWizardModal } from './components/InstallWizardModal'
import { useSidebarResize } from './hooks/useSidebarResize'
import { useSessionPoller } from './hooks/useSessionPoller'
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts'
import { TooltipProvider } from './components/ui/tooltip'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from './components/ui/context-menu'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from './components/ui/empty'

const SIDEBAR_MIN     = 180
const SIDEBAR_MAX     = 480
const SIDEBAR_DEFAULT = 360
const EDGE = 5

const win = getCurrentWindow()

type ResizeDir =
  | 'East' | 'West' | 'North' | 'South'
  | 'NorthEast' | 'NorthWest' | 'SouthEast' | 'SouthWest'

const EDGES: { dir: ResizeDir; style: React.CSSProperties }[] = [
  { dir: 'North',     style: { top: 0, left: EDGE, right: EDGE, height: EDGE, cursor: 'n-resize' } },
  { dir: 'South',     style: { bottom: 0, left: EDGE, right: EDGE, height: EDGE, cursor: 's-resize' } },
  { dir: 'West',      style: { left: 0, top: EDGE, bottom: EDGE, width: EDGE, cursor: 'w-resize' } },
  { dir: 'East',      style: { right: 0, top: EDGE, bottom: EDGE, width: EDGE, cursor: 'e-resize' } },
  { dir: 'NorthWest', style: { top: 0, left: 0, width: EDGE, height: EDGE, cursor: 'nw-resize' } },
  { dir: 'NorthEast', style: { top: 0, right: 0, width: EDGE, height: EDGE, cursor: 'ne-resize' } },
  { dir: 'SouthWest', style: { bottom: 0, left: 0, width: EDGE, height: EDGE, cursor: 'sw-resize' } },
  { dir: 'SouthEast', style: { bottom: 0, right: 0, width: EDGE, height: EDGE, cursor: 'se-resize' } },
]

function ResizeHandles() {
  return (
    <>
      {EDGES.map(({ dir, style }) => (
        <div
          key={dir}
          style={{ position: 'fixed', zIndex: 9999, ...style }}
          onMouseDown={(e) => { e.preventDefault(); void win.startResizeDragging(dir) }}
        />
      ))}
    </>
  )
}

export default function App() {
  const tabs          = useAppStore((s) => s.tabs)
  const activeTabId   = useAppStore((s) => s.activeTabId)
  const documents     = useAppStore((s) => s.documents)
  const sidebarHidden = useAppStore((s) => s.sidebarHidden)
  const focusedPanel  = useAppStore((s) => s.focusedPanel)

  const everActiveRef = useRef<Set<string>>(new Set())
  if (activeTabId) everActiveRef.current.add(activeTabId)

  const { width: sidebarWidth, onResizeStart: handleResizeStart } = useSidebarResize(
    SIDEBAR_DEFAULT,
    SIDEBAR_MIN,
    SIDEBAR_MAX,
  )

  const loadWorkspaces          = useAppStore((s) => s.loadWorkspaces)
  const checkCli                = useAppStore((s) => s.checkCli)
  const checkUpdates            = useAppStore((s) => s.checkUpdates)
  const cliInfo                 = useAppStore((s) => s.cliInfo)
  const openInstallWizard       = useAppStore((s) => s.openInstallWizard)
  const installWizardTriggered  = useAppStore((s) => s.installWizardTriggeredOnce)
  const markWizardTriggered     = useAppStore((s) => s.markInstallWizardTriggered)

  useEffect(() => { void loadWorkspaces() }, [])

  // Check CLI and updates once on startup (after a brief delay to let the daemon come up)
  useEffect(() => {
    const timer = setTimeout(async () => {
      await checkCli()
      void checkUpdates()
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  // Auto-open install wizard when CLI is not detected (once per session)
  useEffect(() => {
    if (cliInfo && !cliInfo.installed && !installWizardTriggered) {
      markWizardTriggered()
      openInstallWizard()
    }
  }, [cliInfo?.installed])

  useSessionPoller(5000)
  useGlobalShortcuts()

  return (
    <TooltipProvider delayDuration={600}>
      <LaunchPickerModal />
      <InstallWizardModal />
      <ContextMenu>
        <ContextMenuContent className="w-44 text-xs">
          <ContextMenuItem className="text-xs gap-2" onClick={() => void invoke('open_devtools').catch(() => void 0)}>
            <Bug size={13} />Open DevTools
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem className="text-xs gap-2" onClick={() => window.location.reload()}>
            <RefreshCw size={13} />Reload UI
          </ContextMenuItem>
        </ContextMenuContent>
        <ContextMenuTrigger asChild>
          <div className="flex h-screen w-screen text-foreground overflow-hidden bg-sidebar gap-2 rounded-2xl">
        <ResizeHandles />

        <Sidebar width={sidebarWidth} collapsed={sidebarHidden} />
        {!sidebarHidden && (
          <div
            className="w-[3px] shrink-0 cursor-col-resize"
            onMouseDown={handleResizeStart}
          />
        )}

        {/* Main column */}
        <main data-orbit-zone="orbit.desktop.principal" className="flex-1 flex flex-col min-w-0 pt-0">
          <TitleBar />

          {/* Inset content — two sibling cards with gap */}
          <div className="flex-1 min-h-0 flex gap-2 pr-2 pb-2">
            {/* Main card */}
            <div data-orbit-zone="orbit.desktop.principal.card" className="flex-1 flex flex-col overflow-hidden rounded-2xl ring-sidebar">
              <TabBar />
              <SessionHeader />
              <div data-orbit-zone="orbit.desktop.principal.card.content" className="relative flex-1 overflow-hidden bg-card">
                {tabs.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <TerminalSquare />
                        </EmptyMedia>
                        <EmptyTitle>No terminal open</EmptyTitle>
                        <EmptyDescription>
                          Select a session from the sidebar or open a new shell to get started.
                        </EmptyDescription>
                      </EmptyHeader>
                      <EmptyContent>
                        <p className="text-xs text-foreground/40">
                          Click <span className="text-foreground/60 font-medium">+ New shell</span> in the tab bar
                        </p>
                      </EmptyContent>
                    </Empty>
                  </div>
                )}

                {tabs.map((tab) => {
                  const isActive = tab.id === activeTabId
                  const everSeen = everActiveRef.current.has(tab.id)
                  if (tab.type === 'shortcuts') {
                    return (
                      <div key={tab.id} className={`absolute inset-0 ${isActive ? '' : 'hidden'}`}>
                        <ShortcutsView />
                      </div>
                    )
                  }
                  if (tab.type === 'uikit') {
                    return (
                      <div key={tab.id} className={`absolute inset-0 ${isActive ? '' : 'hidden'}`}>
                        <UIKitView />
                      </div>
                    )
                  }
                  if (tab.type === 'colors') {
                    return (
                      <div key={tab.id} className={`absolute inset-0 ${isActive ? '' : 'hidden'}`}>
                        <ColorsView />
                      </div>
                    )
                  }
                  if (tab.type === 'settings') {
                    return (
                      <div key={tab.id} className={`absolute inset-0 ${isActive ? '' : 'hidden'}`}>
                        <SettingsView />
                      </div>
                    )
                  }
                  if (tab.type === 'document') {
                    const doc = documents.find((d) => d.id === tab.docId)
                    return (
                      <div key={tab.id} className={`absolute inset-0 ${isActive ? '' : 'hidden'}`}>
                        {doc && <DocumentView doc={doc} />}
                      </div>
                    )
                  }
                  if (tab.type === 'architecture') {
                    return (
                      <div key={tab.id} className={`absolute inset-0 ${isActive ? '' : 'hidden'}`}>
                        {tab.archWorkspace && tab.archTenant && (
                          <ArchitectureView workspace={tab.archWorkspace} tenant={tab.archTenant} />
                        )}
                      </div>
                    )
                  }
                  if (tab.type === 'ui-map') {
                    return (
                      <div key={tab.id} className={`absolute inset-0 ${isActive ? '' : 'hidden'}`}>
                        <DesktopUIView />
                      </div>
                    )
                  }
                  return (
                    <div key={tab.id} className={`absolute inset-0 ${isActive ? '' : 'hidden'}`}>
                      {everSeen && <TerminalPane tabId={tab.id} active={isActive} panelFocused={focusedPanel === 'main'} />}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Drawer cards — siblings, same height, gap from parent */}
            <HarnessDrawer />
            <ArchEditDrawer />
            <TerminalDrawer />
          </div>
        </main>
          </div>
        </ContextMenuTrigger>
      </ContextMenu>
    </TooltipProvider>
  )
}
