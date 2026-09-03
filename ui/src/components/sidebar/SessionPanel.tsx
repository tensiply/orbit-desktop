import { useEffect, useRef } from 'react'
import {
  ExternalLink, Copy, FolderOpen, Wrench, CircleStop,
  CopyPlus, RefreshCw, Plus, Cpu, ChevronDown,
} from 'lucide-react'
import { STATUS_COLORS } from '../../theme'
import { useAppStore } from '../../store'
import type { Session } from '../../types'
import {
  ClaudeEngineIcon,
  GeminiEngineIcon,
  OpenCodeEngineIcon,
  DefaultEngineIcon,
} from '../../icons'
import { workspaceFromWorkDir } from '../../domain/scope'
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
import { MarkerSeparator } from '../ui/marker-separator'
import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../ui/dropdown-menu'
import { RING_CLASS, ENGINES_MENU } from './constants'

const MAX_SESSIONS = 10

function EngineIcon({ engine, size = 12 }: { engine: string; size?: number }) {
  switch (engine) {
    case 'claude':   return <ClaudeEngineIcon size={size} />
    case 'gemini':   return <GeminiEngineIcon size={size} />
    case 'opencode': return <OpenCodeEngineIcon size={size} />
    default:         return <DefaultEngineIcon size={size} />
  }
}

function relativeTime(unixSecs: number): string {
  const diffSecs = Math.floor(Date.now() / 1000) - unixSecs
  if (diffSecs < 60)    return 'just now'
  if (diffSecs < 3600)  return `${Math.floor(diffSecs / 60)}m ago`
  if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`
  return `${Math.floor(diffSecs / 86400)}d ago`
}

function scopeParts(session: Session): string[] {
  const parts: string[] = []
  const ws = workspaceFromWorkDir(session.work_dir)
  if (ws)                  parts.push(ws)
  if (session.tenant)      parts.push(session.tenant)
  if (session.project)     parts.push(session.project)
  if (session.repository)  parts.push(session.repository)
  return parts
}

function sessionLabel(session: Session): string {
  if (session.global_mode) return 'Global'
  const parts = scopeParts(session)
  return parts[parts.length - 1] ?? session.id.slice(0, 8)
}

function sessionBreadcrumb(session: Session): string | null {
  if (session.global_mode) return null
  const parts = scopeParts(session)
  if (parts.length <= 1) return null
  return parts.slice(0, -1).join(' › ')
}

function sessionScopeCrumb(session: Session): string | null {
  if (session.global_mode) return null
  const parts: string[] = []
  if (session.tenant)     parts.push(session.tenant)
  if (session.project)    parts.push(session.project)
  if (session.repository) parts.push(session.repository)
  return parts.length > 0 ? parts.join(' › ') : null
}

function SectionLabel({ label }: { label: string }) {
  return (
    <li className="pr-2 pt-1 pb-2">
      <MarkerSeparator label={label} />
    </li>
  )
}

function SessionItem({
  session,
  active,
  isHistory,
  isCurrent,
  isKeySelected,
  title,
  isBlank,
  onOpen,
  onKill,
  onDuplicate,
  onRestart,
  onLaunchWithEngine,
}: {
  session:            Session
  active:             boolean
  isHistory:          boolean
  isCurrent:          boolean
  isKeySelected:      boolean
  title:              string | undefined
  isBlank:            boolean
  onOpen:             () => void
  onKill:             () => void
  onDuplicate:        () => void
  onRestart:          () => void
  onLaunchWithEngine: (engine: string) => void
}) {
  const blurSidebar       = useAppStore((s) => s.blurSidebar)
  const openHarnessDrawer = useAppStore((s) => s.openHarnessDrawer)
  const status            = useAppStore((s) => s.sessionStatus[session.id])
  const hasLiveTab        = useAppStore((s) => s.tabs.some((t) => t.sessionId === session.id))
  const itemRef   = useRef<HTMLLIElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isKeySelected && itemRef.current) {
      itemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [isKeySelected])

  useEffect(() => {
    const handler = (e: Event) => {
      const { sessionId } = (e as CustomEvent).detail as { sessionId: string }
      if (sessionId !== session.id || !buttonRef.current) return
      const rect = buttonRef.current.getBoundingClientRect()
      buttonRef.current.dispatchEvent(new MouseEvent('contextmenu', {
        bubbles: true,
        clientX: rect.left + 8,
        clientY: rect.top + rect.height / 2,
      }))
    }
    window.addEventListener('orbit:open-session-menu', handler)
    return () => window.removeEventListener('orbit:open-session-menu', handler)
  }, [session.id])

  const engine          = session.engine.toLowerCase()
  const label           = (isBlank && !title) ? '' : (title ?? sessionLabel(session))
  const crumb           = (title || (isBlank && !title)) ? sessionScopeCrumb(session) : sessionBreadcrumb(session)
  const timeStr         = relativeTime(session.started_at)
  const effectiveStatus = !isHistory ? (status ?? (hasLiveTab ? 'idle' : 'offline')) : undefined
  const statusPulses    = effectiveStatus === 'working' || effectiveStatus === 'done'
  const statusColor     =
    effectiveStatus === 'working'                              ? STATUS_COLORS.working
    : effectiveStatus === 'done' || effectiveStatus === 'idle' ? STATUS_COLORS.active
    :                                                            STATUS_COLORS.offline

  const rowClass = isCurrent
    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
    : isHistory
      ? 'text-sidebar-foreground/25 hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground/50'
      : 'text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'

  const copyToClipboard = (text: string) => void navigator.clipboard.writeText(text)

  return (
    <li ref={itemRef}>
      <ContextMenu onOpenChange={(open) => { if (open) blurSidebar() }}>
        <ContextMenuContent className="w-56 text-xs">
          <ContextMenuGroup>
            <ContextMenuItem className="text-xs gap-2" onClick={onOpen}>
              <ExternalLink size={13} />Open session
            </ContextMenuItem>
            <ContextMenuItem className="text-xs gap-2" onClick={() => void openHarnessDrawer(session)}>
              <Wrench size={13} />View harness
            </ContextMenuItem>
            <ContextMenuSub>
              <ContextMenuSubTrigger className="text-xs gap-2">
                <Plus size={13} />New session with…
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-40 text-xs">
                {ENGINES_MENU.map(({ id, label, Icon }) => (
                  <ContextMenuItem
                    key={id}
                    className="text-xs gap-2"
                    onClick={() => onLaunchWithEngine(id)}
                  >
                    <Icon size={13} />{label}
                  </ContextMenuItem>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
          </ContextMenuGroup>
          {!isHistory && (
            <ContextMenuGroup>
              <ContextMenuLabel>Manage</ContextMenuLabel>
              <ContextMenuItem className="text-xs gap-2" onClick={onDuplicate}>
                <CopyPlus size={13} />Duplicate session
              </ContextMenuItem>
              <ContextMenuItem className="text-xs gap-2" onClick={onRestart}>
                <RefreshCw size={13} />Restart session
              </ContextMenuItem>
              <ContextMenuItem
                className="text-xs gap-2 text-destructive focus:text-destructive"
                onClick={onKill}
              >
                <CircleStop size={13} />End session
              </ContextMenuItem>
            </ContextMenuGroup>
          )}
          <ContextMenuGroup>
            <ContextMenuLabel>Copy</ContextMenuLabel>
            <ContextMenuItem className="text-xs gap-2" onClick={() => copyToClipboard(session.id)}>
              <Copy size={13} />Copy session ID
            </ContextMenuItem>
            <ContextMenuItem className="text-xs gap-2" onClick={() => copyToClipboard(session.work_dir)}>
              <FolderOpen size={13} />Copy working directory
            </ContextMenuItem>
            <ContextMenuItem className="text-xs gap-2" onClick={() => copyToClipboard(engine)}>
              <Cpu size={13} />Copy engine name
            </ContextMenuItem>
          </ContextMenuGroup>
        </ContextMenuContent>

        <ContextMenuTrigger asChild>
          <button
            ref={buttonRef}
            data-orbit-zone="orbit.desktop.sidebar.panel.session-item"
            onClick={onOpen}
            onContextMenu={(e) => e.stopPropagation()}
            className={`group relative w-full min-w-0 py-2 px-2 rounded-lg transition-colors text-left ${rowClass} ${isKeySelected ? RING_CLASS : ''}`}
          >
            <span
              className="absolute pointer-events-none select-none text-sidebar-foreground"
              style={{ top: 6, right: 6, opacity: isHistory ? 0.04 : 0.07 }}
            >
              <EngineIcon engine={engine} size={26} />
            </span>
            <div className="flex flex-col gap-0.5 min-w-0 pr-7">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="relative flex items-center justify-center shrink-0">
                  {statusPulses && (
                    <span
                      className="absolute w-4 h-4 rounded-full animate-ping"
                      style={{ backgroundColor: statusColor, opacity: 0.35 }}
                    />
                  )}
                  <span
                    className="w-2.5 h-2.5 rounded-full relative"
                    style={isHistory
                      ? { border: '1.5px solid currentColor', opacity: 0.6 }
                      : { backgroundColor: statusColor, opacity: 0.6 }
                    }
                  />
                </div>
                <span className={`text-xs font-medium leading-snug truncate ${isCurrent ? 'text-sidebar-accent-foreground' : ''}`}>
                  {label}
                </span>
              </div>
              {crumb && (
                <span className={`text-[10px] leading-tight truncate mt-1 ${isHistory ? 'text-sidebar-foreground/20' : 'text-sidebar-foreground/35'}`}>
                  {crumb}
                </span>
              )}
              <span className={`text-[10px] leading-tight ${isHistory ? 'text-sidebar-foreground/15' : 'text-sidebar-foreground/25'}`}>
                {engine} · {timeStr}
              </span>
            </div>
          </button>
        </ContextMenuTrigger>
      </ContextMenu>
    </li>
  )
}

/**
 * NewSessionButton — panel-footer action that launches a session at the current
 * scope (workspace + drilled-in path). Mirrors the files uploader zone: clicking
 * the zone launches with the default engine; the chevron button opens the
 * engine picker.
 */
export function NewSessionButton() {
  const selectedWorkspace  = useAppStore((s) => s.selectedWorkspace)
  const scopePath          = useAppStore((s) => s.scopePath)
  const launchScopeSession = useAppStore((s) => s.launchScopeSession)
  const blurSidebar        = useAppStore((s) => s.blurSidebar)

  const launch = (engine: string) => {
    const fullPath = selectedWorkspace ? [selectedWorkspace, ...scopePath] : [...scopePath]
    blurSidebar()
    void launchScopeSession(fullPath, engine)
  }

  return (
    <div
      onClick={() => launch('claude')}
      className="flex flex-col items-center justify-center gap-1.5 w-full py-4 px-3 rounded-lg cursor-pointer transition-colors text-center text-sidebar-foreground/40 hover:text-sidebar-foreground/60"
    >
      <Plus size={16} className="shrink-0" />
      <span className="text-[10px] leading-tight">New session here</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[10px] px-2 mt-0.5 gap-1 bg-transparent border-0 opacity-40 hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
            title="New session with…"
          >
            <ChevronDown size={12} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-40 text-xs">
          {ENGINES_MENU.map(({ id, label, Icon }) => (
            <DropdownMenuItem key={id} className="text-xs gap-2" onClick={() => launch(id)}>
              <Icon size={13} />{label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function SessionList({
  sessions,
  sessionsLoading,
  activeSessionId,
  sessionTitles,
  blankSessions,
  sidebarFocused,
  sidebarSelectedIdx,
  onOpen,
  onKill,
  onDuplicate,
  onRestart,
  onLaunchWithEngine,
}: {
  sessions:           Session[]
  sessionsLoading:    boolean
  activeSessionId:    string | undefined
  sessionTitles:      Record<string, string>
  blankSessions:      string[]
  sidebarFocused:     boolean
  sidebarSelectedIdx: number
  onOpen:              (s: Session) => void
  onKill:              (s: Session) => void
  onDuplicate:         (s: Session) => void
  onRestart:           (s: Session) => void
  onLaunchWithEngine:  (s: Session, engine: string) => void
}) {
  const nonHistory   = sessions.filter((s) => !s.is_history)
  const historySlots = Math.max(0, MAX_SESSIONS - nonHistory.length)
  const history      = sessions.filter((s) => !!s.is_history).slice(0, historySlots)
  const flat         = [...nonHistory, ...history]

  const isEmpty = nonHistory.length === 0 && history.length === 0

  return (
    <ul data-orbit-zone="orbit.desktop.sidebar.panel.session-list" className="p-0 w-full space-y-2">
      {isEmpty && !sessionsLoading && (
        <li className="px-2 py-1 text-[10px] text-sidebar-foreground/30 italic">No sessions</li>
      )}
      {nonHistory.length > 0 && (
        <>
          <SectionLabel label="Current" />
          {nonHistory.map((s) => {
            const flatIdx = flat.indexOf(s)
            return (
              <SessionItem
                key={s.id}
                session={s}
                active={s.id === activeSessionId}
                isHistory={false}
                isCurrent={s.id === activeSessionId}
                isKeySelected={sidebarFocused && flatIdx === sidebarSelectedIdx}
                title={sessionTitles[s.id]}
                isBlank={blankSessions.includes(s.id)}
                onOpen={() => onOpen(s)}
                onKill={() => onKill(s)}
                onDuplicate={() => onDuplicate(s)}
                onRestart={() => onRestart(s)}
                onLaunchWithEngine={(engine) => onLaunchWithEngine(s, engine)}
              />
            )
          })}
        </>
      )}
      {history.length > 0 && (
        <>
          <SectionLabel label="History" />
          {history.map((s) => {
            const flatIdx = flat.indexOf(s)
            return (
              <SessionItem
                key={s.id}
                session={s}
                active={false}
                isHistory={true}
                isCurrent={false}
                isKeySelected={sidebarFocused && flatIdx === sidebarSelectedIdx}
                title={sessionTitles[s.id]}
                isBlank={false}
                onOpen={() => onOpen(s)}
                onKill={() => {}}
                onDuplicate={() => onDuplicate(s)}
                onRestart={() => {}}
                onLaunchWithEngine={(engine) => onLaunchWithEngine(s, engine)}
              />
            )
          })}
        </>
      )}
    </ul>
  )
}
