import { useEffect, useRef } from 'react'
import { Loader2, ChevronLeft, ChevronRight, Plus, FolderOpen, Wrench } from 'lucide-react'
import { useAppStore } from '../../store'
import { tauriService } from '../../services/tauri'
import { getScopeChildren } from '../../lib/sidebarNav'
import { cn } from '@/lib/utils'
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '../ui/context-menu'
import { RING_CLASS, ENGINES_MENU } from './constants'

const LEVEL_LABELS_ALL    = ['workspace', 'tenant', 'project', 'repository'] as const
const LEVEL_LABELS_SCOPED = ['tenant', 'project', 'repository'] as const

export function ViewModeToggle() {
  const scopeViewMode    = useAppStore((s) => s.scopeViewMode)
  const setScopeViewMode = useAppStore((s) => s.setScopeViewMode)
  const loadScopeTree    = useAppStore((s) => s.loadScopeTree)
  const navView          = useAppStore((s) => s.navView)

  const showHistory = navView === 'terminal'

  return (
    <div className="shrink-0 rounded border border-sidebar-border/50 overflow-hidden">
      <ToggleGroup
        type="single"
        value={scopeViewMode}
        onValueChange={(v) => {
          if (!v) return
          if (v === 'scope') void loadScopeTree()
          setScopeViewMode(v as 'all' | 'scope' | 'history')
        }}
        className="gap-0"
      >
        <ToggleGroupItem
          value="all"
          className={cn(
            'text-[9px] h-[18px] px-1.5 rounded-none border-r border-sidebar-border/50',
            scopeViewMode === 'all'
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'bg-transparent text-sidebar-foreground/30 hover:text-sidebar-foreground/60 hover:bg-sidebar-accent/20',
          )}
        >
          All
        </ToggleGroupItem>
        <ToggleGroupItem
          value="scope"
          className={cn(
            'text-[9px] h-[18px] px-1.5 rounded-none',
            showHistory ? 'border-r border-sidebar-border/50' : '',
            scopeViewMode === 'scope'
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'bg-transparent text-sidebar-foreground/30 hover:text-sidebar-foreground/60 hover:bg-sidebar-accent/20',
          )}
        >
          Scope
        </ToggleGroupItem>
        {showHistory && (
          <ToggleGroupItem
            value="history"
            className={cn(
              'text-[9px] h-[18px] px-1.5 rounded-none',
              scopeViewMode === 'history'
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'bg-transparent text-sidebar-foreground/30 hover:text-sidebar-foreground/60 hover:bg-sidebar-accent/20',
            )}
          >
            Hist
          </ToggleGroupItem>
        )}
      </ToggleGroup>
    </div>
  )
}

export function ScopeNavigator({
  backSelected,
  selectedFolderName,
}: {
  backSelected:       boolean
  selectedFolderName: string | null
}) {
  const scopeTree          = useAppStore((s) => s.scopeTree)
  const scopeTreeLoading   = useAppStore((s) => s.scopeTreeLoading)
  const scopePath          = useAppStore((s) => s.scopePath)
  const navigateIn         = useAppStore((s) => s.navigateScopeIn)
  const navigateOut        = useAppStore((s) => s.navigateScopeOut)
  const selectedWorkspace  = useAppStore((s) => s.selectedWorkspace)
  const launchScopeSession = useAppStore((s) => s.launchScopeSession)
  const blurSidebar        = useAppStore((s) => s.blurSidebar)
  const openHarnessDrawerForScope = useAppStore((s) => s.openHarnessDrawerForScope)

  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  useEffect(() => {
    const handler = (e: Event) => {
      const { name } = (e as CustomEvent).detail as { name: string }
      const btn = buttonRefs.current.get(name)
      if (!btn) return
      const rect = btn.getBoundingClientRect()
      btn.dispatchEvent(new MouseEvent('contextmenu', {
        bubbles: true,
        clientX: rect.left + 8,
        clientY: rect.top + rect.height / 2,
      }))
    }
    window.addEventListener('orbit:open-scope-folder-menu', handler)
    return () => window.removeEventListener('orbit:open-scope-folder-menu', handler)
  }, [])

  const launchFolder = (folderName: string, engine: string) => {
    const fullPath = selectedWorkspace
      ? [selectedWorkspace, ...scopePath, folderName]
      : [...scopePath, folderName]
    blurSidebar()
    void launchScopeSession(fullPath, engine)
  }

  const launchCurrentScope = (engine: string) => {
    const fullPath = selectedWorkspace
      ? [selectedWorkspace, ...scopePath]
      : [...scopePath]
    blurSidebar()
    void launchScopeSession(fullPath, engine)
  }

  const openHarnessForFolder = (folderName: string, engine: string) => {
    const fullPath = selectedWorkspace
      ? [selectedWorkspace, ...scopePath, folderName]
      : [...scopePath, folderName]
    const [ws, tenant = null, project = null, repository = null] = fullPath
    void openHarnessDrawerForScope(ws, tenant, project, repository, engine)
  }

  const openFolderInExplorer = (folderName: string) => {
    const pathSegments = selectedWorkspace
      ? [selectedWorkspace, ...scopePath, folderName]
      : [...scopePath, folderName]
    void tauriService.scopeOpenFolder(pathSegments)
  }

  const children    = getScopeChildren(scopeTree, scopePath, selectedWorkspace)
  const levelLabels = selectedWorkspace ? LEVEL_LABELS_SCOPED : LEVEL_LABELS_ALL
  const levelLabel  = levelLabels[scopePath.length] ?? ''

  if (scopeTreeLoading && scopeTree.length === 0) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-2 text-sidebar-foreground/30">
        <Loader2 size={11} className="animate-spin" />
        <span className="text-[10px]">Loading scopes…</span>
      </div>
    )
  }

  if (!scopeTreeLoading && scopeTree.length === 0) {
    return (
      <p className="text-[10px] text-sidebar-foreground/25 px-2 py-1 italic">No scopes found</p>
    )
  }

  return (
    <div data-orbit-zone="orbit.desktop.sidebar.panel.scope-nav" className="mb-3">
      {/* Back / breadcrumb */}
      {scopePath.length > 0 && (
        <button
          onClick={navigateOut}
          className={`flex items-center gap-1 w-full px-2 py-1 mb-1 rounded-md text-[10px] text-sidebar-foreground/40 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground/70 transition-colors ${backSelected ? RING_CLASS : ''}`}
        >
          <ChevronLeft size={10} className="shrink-0" />
          <span className="truncate">{scopePath.join(' › ')}</span>
        </button>
      )}

      {/* Children */}
      {children.length > 0 && (
        <div className="mb-1">
          {scopePath.length > 0 && (
            <div className="px-2 pt-0.5 pb-0.5">
              <span className="text-[9px] text-sidebar-foreground/20 uppercase tracking-wider">
                {levelLabel}
              </span>
            </div>
          )}
          <ul className="space-y-0.5">
            {children.map((name) => {
              const isSelected = selectedFolderName === name
              return (
                <li key={name}>
                  <ContextMenu onOpenChange={(open) => { if (open) blurSidebar() }}>
                    <ContextMenuTrigger asChild>
                      <button
                        ref={(el) => { if (el) buttonRefs.current.set(name, el); else buttonRefs.current.delete(name) }}
                        onClick={() => navigateIn(name)}
                        onContextMenu={(e) => e.stopPropagation()}
                        className={`group flex items-center justify-between w-full px-2 py-1.5 rounded-md text-xs text-sidebar-foreground/55 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors ${isSelected ? RING_CLASS : ''}`}
                      >
                        <span className="truncate">{name}</span>
                        <ChevronRight size={11} className="shrink-0 text-sidebar-foreground/20 group-hover:text-sidebar-accent-foreground/50 transition-colors" />
                      </button>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-48 text-xs">
                      <ContextMenuGroup>
                        <ContextMenuLabel>Launch</ContextMenuLabel>
                        <ContextMenuSub>
                          <ContextMenuSubTrigger className="text-xs gap-2">
                            <Plus size={13} />New session with…
                          </ContextMenuSubTrigger>
                          <ContextMenuSubContent className="w-40 text-xs">
                            {ENGINES_MENU.map(({ id, label, Icon }) => (
                              <ContextMenuItem
                                key={id}
                                className="text-xs gap-2"
                                onClick={() => launchFolder(name, id)}
                              >
                                <Icon size={13} />{label}
                              </ContextMenuItem>
                            ))}
                          </ContextMenuSubContent>
                        </ContextMenuSub>
                        <ContextMenuSub>
                          <ContextMenuSubTrigger className="text-xs gap-2">
                            <Wrench size={13} />View harness with…
                          </ContextMenuSubTrigger>
                          <ContextMenuSubContent className="w-40 text-xs">
                            {ENGINES_MENU.map(({ id, label, Icon }) => (
                              <ContextMenuItem
                                key={id}
                                className="text-xs gap-2"
                                onClick={() => openHarnessForFolder(name, id)}
                              >
                                <Icon size={13} />{label}
                              </ContextMenuItem>
                            ))}
                          </ContextMenuSubContent>
                        </ContextMenuSub>
                      </ContextMenuGroup>
                      <ContextMenuGroup>
                        <ContextMenuLabel>Folder</ContextMenuLabel>
                        <ContextMenuItem
                          className="text-xs gap-2"
                          onClick={() => openFolderInExplorer(name)}
                        >
                          <FolderOpen size={13} />Open in explorer
                        </ContextMenuItem>
                      </ContextMenuGroup>
                    </ContextMenuContent>
                  </ContextMenu>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* New Session button — launches at current scope level (not shown at root) */}
      {scopePath.length > 0 && (
        <ContextMenu onOpenChange={(open) => { if (open) blurSidebar() }}>
          <ContextMenuTrigger asChild>
            <button
              onClick={() => launchCurrentScope('claude')}
              className="group flex items-center gap-1.5 w-full px-2 py-1.5 rounded-md text-xs text-sidebar-foreground/35 border border-dashed border-sidebar-border/40 hover:border-sidebar-border/70 hover:text-sidebar-foreground/60 transition-colors"
            >
              <Plus size={11} className="shrink-0" />
              <span>New Session</span>
            </button>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-40 text-xs">
            {ENGINES_MENU.map(({ id, label, Icon }) => (
              <ContextMenuItem
                key={id}
                className="text-xs gap-2"
                onClick={() => launchCurrentScope(id)}
              >
                <Icon size={13} />{label}
              </ContextMenuItem>
            ))}
          </ContextMenuContent>
        </ContextMenu>
      )}

      {scopePath.length > 0 && children.length > 0 && (
        <div className="my-1.5 border-t border-sidebar-border/40" />
      )}
    </div>
  )
}
