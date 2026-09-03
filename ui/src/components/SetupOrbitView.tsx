import { useState, useRef, useEffect } from 'react'
import { listen } from '@tauri-apps/api/event'
import { open as openFolder } from '@tauri-apps/plugin-dialog'
import {
  CheckCircle2, XCircle, ArrowUpCircle, Loader2, Terminal,
  RefreshCw, FolderOpen, Plus, Monitor,
} from 'lucide-react'
import { useAppStore } from '../store'
import { tauriService } from '../services/tauri'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Skeleton } from './ui/skeleton'
import { cn } from '@/lib/utils'

// ── Constants ──────────────────────────────────────────────────────────────────

const ENGINES = [
  {
    id:    'claude',
    label: 'Claude Code',
    hint:  'Anthropic Claude',
    cmd:   'claude',
  },
  {
    id:    'opencode',
    label: 'OpenCode',
    hint:  'Open-source alternative',
    cmd:   'opencode',
  },
  {
    id:    'gemini',
    label: 'Gemini',
    hint:  'Google Gemini',
    cmd:   'gemini',
  },
]

// ── Shared helpers ─────────────────────────────────────────────────────────────

function ConsoleOutput({ lines, running }: { lines: string[]; running: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight
  }, [lines])
  return (
    <div
      ref={ref}
      className="h-28 overflow-y-auto rounded-md bg-black/70 p-3 font-mono text-[10px] text-green-400/90 leading-relaxed"
    >
      {lines.length === 0 && running && (
        <span className="text-muted-foreground/50 animate-pulse">Starting…</span>
      )}
      {lines.map((line, i) => <div key={i}>{line}</div>)}
    </div>
  )
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full',
      ok
        ? 'bg-primary/10 text-primary'
        : 'bg-muted text-muted-foreground',
    )}>
      {ok
        ? <CheckCircle2 size={9} />
        : <XCircle size={9} />}
      {label}
    </span>
  )
}

// ── DesktopStep ────────────────────────────────────────────────────────────────

export function DesktopStep() {
  const updateCheck        = useAppStore((s) => s.updateCheck)
  const updatesChecking    = useAppStore((s) => s.updatesChecking)
  const checkUpdates       = useAppStore((s) => s.checkUpdates)
  const desktopUpdating    = useAppStore((s) => s.desktopUpdating)
  const desktopUpdateError = useAppStore((s) => s.desktopUpdateError)
  const installDesktop     = useAppStore((s) => s.installDesktop)

  const current   = updateCheck?.desktop.current ?? null
  const latest    = updateCheck?.desktop.latest ?? null
  const hasUpdate = updateCheck?.desktop.has_update ?? false
  const isLoading = updateCheck === null && updatesChecking

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-4 w-40" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {current
            ? <StatusBadge ok={true} label="Running" />
            : <span className="text-xs text-muted-foreground">No data</span>
          }
          {current && (
            <code className="text-xs font-mono text-muted-foreground">{current}</code>
          )}
          {hasUpdate && latest && (
            <span className="flex items-center gap-1 text-xs text-primary font-medium">
              <ArrowUpCircle size={12} />
              {latest} available
            </span>
          )}
          {!hasUpdate && current && (
            <span className="text-[10px] text-muted-foreground/60">· up to date</span>
          )}
        </div>
        <button
          onClick={() => void checkUpdates()}
          disabled={updatesChecking}
          className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          title="Check for updates"
        >
          <RefreshCw size={12} className={updatesChecking ? 'animate-spin' : ''} />
        </button>
      </div>

      {updateCheck === null && !updatesChecking && (
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => void checkUpdates()}
        >
          <RefreshCw size={13} />
          Check for updates
        </Button>
      )}

      {hasUpdate && latest && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <ArrowUpCircle size={18} className="text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Version {latest} is available</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Orbit Desktop downloads, verifies, and installs the update, then
                restarts. The bundled orbit CLI updates with it.
              </p>
            </div>
          </div>
          <Button
            className="w-full gap-2"
            disabled={desktopUpdating}
            onClick={() => void installDesktop()}
          >
            {desktopUpdating
              ? <><Loader2 size={14} className="animate-spin" />Updating…</>
              : <><Monitor size={14} />Update to {latest} &amp; restart</>
            }
          </Button>
          {desktopUpdateError && (
            <p className="text-[11px] text-destructive bg-destructive/10 rounded px-2 py-1">
              {desktopUpdateError}
            </p>
          )}
        </div>
      )}

      {!hasUpdate && current && !updatesChecking && (
        <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-muted/20 px-4 py-3">
          <CheckCircle2 size={16} className="text-primary/70 shrink-0" />
          <div>
            <p className="text-sm font-medium">You're up to date</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {current} is the latest version.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── EnginesStep ────────────────────────────────────────────────────────────────

export function EnginesStep() {
  const getSettingValue = useAppStore((s) => s.getSettingValue)
  const updateSetting   = useAppStore((s) => s.updateSetting)

  const defaultEngine = (getSettingValue('engine.default') as string | undefined) ?? 'claude'

  return (
    <div className="space-y-2">
      {ENGINES.map((eng) => {
        const isDefault = eng.id === defaultEngine
        return (
          <button
            key={eng.id}
            onClick={() => updateSetting('engine.default', eng.id)}
            className={cn(
              'w-full flex items-center gap-3.5 px-4 py-3.5 rounded-lg border text-left transition-all',
              isDefault
                ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                : 'border-border hover:border-border/70 hover:bg-muted/30',
            )}
          >
            {/* Radio indicator */}
            <div className={cn(
              'w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors',
              isDefault ? 'border-primary' : 'border-muted-foreground/30',
            )}>
              {isDefault && <div className="w-2 h-2 rounded-full bg-primary" />}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{eng.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {eng.hint}
                <span className="text-muted-foreground/50"> · requires </span>
                <code className="text-[11px]">{eng.cmd}</code>
                <span className="text-muted-foreground/50"> CLI</span>
              </p>
            </div>

            {isDefault && (
              <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
                Default
              </span>
            )}
          </button>
        )
      })}

      <p className="pt-1 text-[11px] text-muted-foreground/60 leading-relaxed">
        You can change this at any time in Settings → Engine.
        The CLI for each engine must be installed separately on your system.
      </p>
    </div>
  )
}

// ── WorkspacesStep ─────────────────────────────────────────────────────────────

export function WorkspacesStep() {
  const registeredWorkspaces = useAppStore((s) => s.registeredWorkspaces)
  const loadWorkspaces       = useAppStore((s) => s.loadWorkspaces)
  const loadScopeTree        = useAppStore((s) => s.loadScopeTree)
  const checkSetup           = useAppStore((s) => s.checkSetup)

  const hasWorkspaces = registeredWorkspaces.length > 0

  const [wsPath,     setWsPath]     = useState('')
  const [wsName,     setWsName]     = useState('')
  const [adding,     setAdding]     = useState(false)
  const [wsLines,    setWsLines]    = useState<string[]>([])
  const [wsError,    setWsError]    = useState<string | null>(null)
  const [addedName,  setAddedName]  = useState<string | null>(null)
  const [showForm,   setShowForm]   = useState(!hasWorkspaces)

  // When workspaces load after adding one, keep form collapsed
  useEffect(() => {
    if (hasWorkspaces && addedName) setShowForm(false)
  }, [hasWorkspaces])

  const pickFolder = async () => {
    const selected = await openFolder({ directory: true, multiple: false, recursive: false })
    if (typeof selected === 'string' && selected) setWsPath(selected)
  }

  const addWorkspace = async () => {
    setAdding(true)
    setWsLines([])
    setWsError(null)
    const unlisten = await listen<string>('setup_output', (ev) => {
      setWsLines((prev) => [...prev, ev.payload])
    })
    try {
      await tauriService.orbitWorkspaceAdd(wsPath.trim(), wsName.trim() || undefined)
      setAddedName(wsName.trim() || wsPath.split('/').pop() || wsPath.trim())
      setWsPath('')
      setWsName('')
      await Promise.all([checkSetup(), loadWorkspaces(), loadScopeTree()])
    } catch (e) {
      setWsError(String(e))
    } finally {
      setAdding(false)
      unlisten()
    }
  }

  return (
    <div className="space-y-4">
      {/* Registered workspaces */}
      {hasWorkspaces && (
        <div className="space-y-1.5">
          {registeredWorkspaces.map((ws) => (
            <div
              key={ws.slug}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/50 bg-muted/20"
            >
              <CheckCircle2 size={14} className="text-primary/70 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium">{ws.name}</span>
                {ws.slug !== ws.name && (
                  <code className="ml-2 text-[11px] font-mono text-muted-foreground">{ws.slug}</code>
                )}
              </div>
              {ws.is_default && (
                <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
                  Default
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Success flash */}
      {addedName && !showForm && (
        <div className="flex items-center gap-2 rounded-md bg-primary/8 px-3 py-2">
          <CheckCircle2 size={14} className="text-primary shrink-0" />
          <span className="text-sm text-primary font-medium">"{addedName}" added</span>
        </div>
      )}

      {/* Add another trigger */}
      {hasWorkspaces && !showForm && (
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => { setShowForm(true); setAddedName(null) }}
        >
          <Plus size={14} />
          Add another workspace
        </Button>
      )}

      {/* Add form — open by default when no workspaces */}
      {showForm && (
        <div className="space-y-3 rounded-lg border border-border/50 bg-muted/10 p-4">
          <p className="text-xs font-medium text-foreground">
            {hasWorkspaces ? 'Add another workspace' : 'Register your first workspace'}
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="ws-path" className="text-xs font-medium">
              Directory path <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="ws-path"
                value={wsPath}
                onChange={(e) => setWsPath(e.target.value)}
                placeholder="~/projects"
                className="h-8 text-xs font-mono"
                disabled={adding}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => void pickFolder()}
                disabled={adding}
                className="shrink-0 px-2.5"
                title="Browse folder"
              >
                <FolderOpen size={14} />
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ws-name" className="text-xs font-medium text-muted-foreground">
              Name <span className="text-muted-foreground/50 font-normal">(optional)</span>
            </Label>
            <Input
              id="ws-name"
              value={wsName}
              onChange={(e) => setWsName(e.target.value)}
              placeholder="personal"
              className="h-8 text-xs"
              disabled={adding}
            />
          </div>

          {wsPath.trim() && (
            <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
              <Terminal size={11} className="text-muted-foreground/50 shrink-0" />
              <code className="text-[11px] font-mono text-muted-foreground break-all">
                orbit workspace add {wsPath.trim()}{wsName.trim() ? ` --name ${wsName.trim()}` : ''}
              </code>
            </div>
          )}

          {(adding || wsError) && (
            <>
              <ConsoleOutput lines={wsLines} running={adding} />
              {wsError && (
                <p className="text-xs text-destructive bg-destructive/10 rounded px-2 py-1.5">
                  {wsError}
                </p>
              )}
            </>
          )}

          <div className="flex gap-2">
            {hasWorkspaces && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => { setShowForm(false); setWsError(null) }}
                disabled={adding}
              >
                Cancel
              </Button>
            )}
            <Button
              size="sm"
              disabled={adding || !wsPath.trim()}
              onClick={() => void addWorkspace()}
              className="flex-1 gap-2"
            >
              {adding
                ? <><Loader2 size={13} className="animate-spin" />Adding…</>
                : wsError ? 'Retry'
                : <><Plus size={13} />Add workspace</>
              }
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
