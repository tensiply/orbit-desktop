import { Fragment, useState, useEffect, useRef } from 'react'
import { listen } from '@tauri-apps/api/event'
import { open as openFolder } from '@tauri-apps/plugin-dialog'
import {
  CheckCircle2, Circle, CircleDot, Loader2, Terminal, Package, AlertCircle, PlusCircle, FolderOpen,
} from 'lucide-react'
import { useAppStore } from '../store'
import { tauriService } from '../services/tauri'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog'
import { Button } from './ui/button'

// ── Types ──────────────────────────────────────────────────────────────────────

type Phase = 'install-cli' | 'add-workspace'
type RunState = 'idle' | 'running' | 'error'
type InstallMethod = 'github' | 'cargo' | 'brew'

const PHASE_LABELS: Record<Phase, string> = {
  'install-cli':   'Install CLI',
  'add-workspace': 'Add workspace',
}

const INSTALL_OPTIONS: { method: InstallMethod; label: string; hint: string; command: string }[] = [
  {
    method:  'github',
    label:   'Download binary',
    hint:    'Pre-built binary for this platform. Fastest option.',
    command: 'curl -sSL https://install.orbit.sh | sh',
  },
  {
    method:  'cargo',
    label:   'cargo install orbit',
    hint:    'Compile from source. Requires Rust toolchain.',
    command: 'cargo install orbit --locked',
  },
  {
    method:  'brew',
    label:   'brew install tensiply/tap/orbit',
    hint:    'macOS only. Requires Homebrew.',
    command: 'brew install tensiply/tap/orbit',
  },
]

// ── Helpers ────────────────────────────────────────────────────────────────────

function StepDot({ state, label }: { state: 'pending' | 'active' | 'done'; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {state === 'done'    && <CheckCircle2 size={14} className="text-primary shrink-0" />}
      {state === 'active'  && <CircleDot size={14} className="text-primary shrink-0" />}
      {state === 'pending' && <Circle size={14} className="text-foreground/20 shrink-0" />}
      <span className={`text-xs ${
        state === 'active'  ? 'text-foreground font-medium' :
        state === 'done'    ? 'text-foreground/60' :
                              'text-foreground/30'
      }`}>
        {label}
      </span>
    </div>
  )
}

function OutputConsole({ lines, running }: { lines: string[]; running: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight
  }, [lines])
  return (
    <div
      ref={ref}
      className="flex-1 min-h-[120px] max-h-[160px] overflow-y-auto rounded-lg bg-black/60 p-2.5 font-mono text-[10px] text-green-400/80 leading-relaxed"
    >
      {lines.length === 0 && running && (
        <span className="text-foreground/30">Starting…</span>
      )}
      {lines.map((line, i) => <div key={i}>{line}</div>)}
    </div>
  )
}

// ── Main wizard ────────────────────────────────────────────────────────────────

export function SetupWizardModal() {
  const open              = useAppStore((s) => s.setupWizardOpen)
  const close             = useAppStore((s) => s.closeSetupWizard)
  const setupStatus       = useAppStore((s) => s.setupStatus)
  const checkSetup        = useAppStore((s) => s.checkSetup)
  const loadScopeTree     = useAppStore((s) => s.loadScopeTree)
  const loadWorkspaces    = useAppStore((s) => s.loadWorkspaces)
  const registeredWorkspaces = useAppStore((s) => s.registeredWorkspaces)

  // Which phases are needed
  const phases: Phase[] = []
  if (setupStatus && !setupStatus.cli_installed) phases.push('install-cli')
  if (setupStatus && !setupStatus.has_workspaces) phases.push('add-workspace')

  const [phaseIdx, setPhaseIdx] = useState(0)
  const currentPhase = phases[phaseIdx] ?? null

  // Install CLI phase state
  const [installMethod, setInstallMethod] = useState<InstallMethod>('github')
  const [installState, setInstallState]   = useState<RunState>('idle')
  const [installLines, setInstallLines]   = useState<string[]>([])
  const [installError, setInstallError]   = useState<string | null>(null)
  const [installDone, setInstallDone]     = useState(false)

  // Add workspace phase state
  const [wsPath,  setWsPath]  = useState('')
  const [wsName,  setWsName]  = useState('')
  const [wsState, setWsState] = useState<RunState>('idle')
  const [wsLines, setWsLines] = useState<string[]>([])
  const [wsError, setWsError] = useState<string | null>(null)

  const isRunning = installState === 'running' || wsState === 'running'

  // Reset all state when the modal opens
  useEffect(() => {
    if (open) {
      setPhaseIdx(0)
      setInstallMethod('github')
      setInstallState('idle')
      setInstallLines([])
      setInstallError(null)
      setInstallDone(false)
      setWsPath('')
      setWsName('')
      setWsState('idle')
      setWsLines([])
      setWsError(null)
    }
  }, [open])

  const advance = async () => {
    if (phaseIdx + 1 < phases.length) {
      setPhaseIdx((i) => i + 1)
    } else {
      await checkSetup()
      close()
    }
  }

  const skipPhase = () => {
    if (phaseIdx + 1 < phases.length) {
      setPhaseIdx((i) => i + 1)
    } else {
      close()
    }
  }

  // ── Install CLI ───────────────────────────────────────────────────────────────

  const startInstall = async () => {
    setInstallState('running')
    setInstallLines([])
    setInstallError(null)

    const unlisten = await listen<string>('cli_install_output', (ev) => {
      setInstallLines((prev) => [...prev, ev.payload])
    })

    try {
      await tauriService.cliInstall(installMethod)
      setInstallDone(true)
      setInstallState('idle')
      await checkSetup()
    } catch (e) {
      setInstallError(String(e))
      setInstallState('error')
    } finally {
      unlisten()
    }
  }

  // ── Add workspace ─────────────────────────────────────────────────────────────

  const pickFolder = async () => {
    const selected = await openFolder({ directory: true, multiple: false, recursive: false })
    if (typeof selected === 'string' && selected) {
      setWsPath(selected)
    }
  }

  const startWorkspaceAdd = async () => {
    setWsState('running')
    setWsLines([])
    setWsError(null)

    const unlisten = await listen<string>('setup_output', (ev) => {
      setWsLines((prev) => [...prev, ev.payload])
    })

    try {
      await tauriService.orbitWorkspaceAdd(wsPath.trim(), wsName.trim() || undefined)
      setWsPath('')
      setWsName('')
      setWsState('idle')
      await Promise.all([checkSetup(), loadWorkspaces(), loadScopeTree()])
    } catch (e) {
      setWsError(String(e))
      setWsState('error')
    } finally {
      unlisten()
    }
  }

  // ── Phase breadcrumb helpers ───────────────────────────────────────────────────

  const dotState = (idx: number): 'pending' | 'active' | 'done' => {
    if (idx < phaseIdx)  return 'done'
    if (idx === phaseIdx) return 'active'
    return 'pending'
  }

  // ── Empty guard: if no phases needed, close immediately ───────────────────────

  if (open && phases.length === 0 && setupStatus !== null) {
    close()
    return null
  }

  // ── Current phase sub-state ───────────────────────────────────────────────────

  const installSelected = INSTALL_OPTIONS.find((o) => o.method === installMethod)!
  const hasWorkspaces   = registeredWorkspaces.length > 0

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !isRunning) close() }}>
      <DialogContent
        data-orbit-zone="orbit.desktop.modal.setup-wizard"
        className="max-w-[480px] p-0 overflow-hidden gap-0 rounded-xl"
      >
        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <Package size={15} className="text-primary shrink-0" />
            <DialogTitle className="text-sm font-semibold leading-none">
              Set up Orbit
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs mt-1 text-foreground/50">
            Complete these steps to start using Orbit Desktop.
          </DialogDescription>
        </div>

        {/* Phase breadcrumb — only when there are 2+ phases */}
        {phases.length > 1 && (
          <div className="flex items-center gap-4 px-5 py-2.5 border-b border-border/30 bg-foreground/2">
            {phases.map((phase, idx) => (
              <Fragment key={phase}>
                {idx > 0 && <div className="h-px flex-1 bg-foreground/10" />}
                <StepDot state={dotState(idx)} label={PHASE_LABELS[phase]} />
              </Fragment>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="px-5 py-4 min-h-[220px] flex flex-col gap-3">

          {/* ── Install CLI phase ─────────────────────────────────────────────── */}

          {currentPhase === 'install-cli' && installState === 'idle' && !installDone && (
            <>
              <p className="text-xs text-foreground/60 leading-relaxed">
                Choose how to install the Orbit CLI. It is required to launch and manage AI sessions.
              </p>

              <div className="flex flex-col gap-2 mt-1">
                {INSTALL_OPTIONS.map((opt) => (
                  <button
                    key={opt.method}
                    onClick={() => setInstallMethod(opt.method)}
                    className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border transition-colors text-left ${
                      installMethod === opt.method
                        ? 'border-primary/60 bg-primary/5'
                        : 'border-border hover:border-border/80 hover:bg-foreground/3'
                    }`}
                  >
                    <div className="mt-0.5 w-3 h-3 rounded-full border-2 shrink-0 flex items-center justify-center border-primary">
                      {installMethod === opt.method && (
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">{opt.label}</p>
                      <p className="text-[11px] text-foreground/45 mt-0.5">{opt.hint}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-1 p-2.5 rounded-lg bg-foreground/4 flex items-start gap-2">
                <Terminal size={12} className="text-foreground/35 mt-0.5 shrink-0" />
                <code className="text-[11px] font-mono text-foreground/50 break-all">
                  {installSelected.command}
                </code>
              </div>
            </>
          )}

          {currentPhase === 'install-cli' && installState === 'idle' && installDone && (
            <div className="flex flex-col items-center justify-center gap-3 py-6">
              <CheckCircle2 size={36} className="text-primary" />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Orbit CLI installed</p>
                <p className="text-xs text-foreground/50 mt-0.5">The CLI is ready to use.</p>
              </div>
            </div>
          )}

          {currentPhase === 'install-cli' && (installState === 'running' || installState === 'error') && (
            <>
              <div className="flex items-center gap-2">
                {installState === 'running' ? (
                  <>
                    <Loader2 size={12} className="animate-spin text-primary shrink-0" />
                    <span className="text-xs text-foreground/60">Installing via {installMethod}…</span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={12} className="text-destructive shrink-0" />
                    <span className="text-xs text-destructive">Installation failed</span>
                  </>
                )}
              </div>
              <OutputConsole lines={installLines} running={installState === 'running'} />
              {installError && (
                <p className="text-[11px] text-destructive bg-destructive/10 rounded px-2 py-1.5 leading-relaxed">
                  {installError}
                </p>
              )}
            </>
          )}

          {/* ── Add workspace phase ───────────────────────────────────────────── */}

          {currentPhase === 'add-workspace' && wsState === 'idle' && (
            <>
              <p className="text-xs text-foreground/60 leading-relaxed">
                Register a workspace so Orbit can track your projects and load the right context for AI sessions.
              </p>

              {/* Registered workspaces list */}
              {hasWorkspaces && (
                <div className="flex flex-col gap-1">
                  <p className="text-[11px] text-foreground/40 font-medium uppercase tracking-wide">
                    Registered workspaces
                  </p>
                  <div className="flex flex-col gap-1">
                    {registeredWorkspaces.map((ws) => (
                      <div
                        key={ws.slug}
                        className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md bg-foreground/4 border border-border/40"
                      >
                        <CheckCircle2 size={12} className="text-primary shrink-0" />
                        <span className="text-xs font-medium text-foreground">{ws.name}</span>
                        {ws.slug !== ws.name && (
                          <span className="text-[11px] text-foreground/35 font-mono">{ws.slug}</span>
                        )}
                        {ws.is_default && (
                          <span className="ml-auto text-[10px] text-primary/60 bg-primary/8 px-1.5 py-0.5 rounded">
                            default
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add form */}
              <div className="flex flex-col gap-2.5">
                <p className="text-[11px] text-foreground/40 font-medium uppercase tracking-wide">
                  {hasWorkspaces ? 'Add another' : 'Add workspace'}
                </p>
                <div>
                  <label className="text-[11px] text-foreground/50 mb-1 block">
                    Workspace path {!hasWorkspaces && <span className="text-destructive">*</span>}
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={wsPath}
                      onChange={(e) => setWsPath(e.target.value)}
                      placeholder="~/projects  or  /home/user/work"
                      className="flex-1 h-7 px-2.5 rounded-md bg-foreground/5 border border-border text-xs font-mono placeholder:text-foreground/25 focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                    <button
                      onClick={() => void pickFolder()}
                      title="Browse folder"
                      className="h-7 px-2 rounded-md border border-border bg-foreground/5 hover:bg-foreground/10 transition-colors flex items-center gap-1 text-foreground/50 hover:text-foreground/80"
                    >
                      <FolderOpen size={13} />
                    </button>
                  </div>
                  {!hasWorkspaces && (
                    <p className="text-[10px] text-foreground/35 mt-1">
                      Must be an existing directory. Tilde (~) is expanded automatically.
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-[11px] text-foreground/50 mb-1 block">
                    Name <span className="text-foreground/30">(optional — defaults to directory name)</span>
                  </label>
                  <input
                    type="text"
                    value={wsName}
                    onChange={(e) => setWsName(e.target.value)}
                    placeholder="personal"
                    className="w-full h-7 px-2.5 rounded-md bg-foreground/5 border border-border text-xs placeholder:text-foreground/25 focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                </div>
              </div>

              {wsPath.trim() && (
                <div className="p-2.5 rounded-lg bg-foreground/4 flex items-start gap-2">
                  <Terminal size={12} className="text-foreground/35 mt-0.5 shrink-0" />
                  <code className="text-[11px] font-mono text-foreground/50 break-all">
                    orbit workspace add {wsPath.trim()}
                    {wsName.trim() ? ` --name ${wsName.trim()}` : ''}
                  </code>
                </div>
              )}
            </>
          )}

          {currentPhase === 'add-workspace' && (wsState === 'running' || wsState === 'error') && (
            <>
              <div className="flex items-center gap-2">
                {wsState === 'running' ? (
                  <>
                    <Loader2 size={12} className="animate-spin text-primary shrink-0" />
                    <span className="text-xs text-foreground/60">Registering workspace…</span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={12} className="text-destructive shrink-0" />
                    <span className="text-xs text-destructive">Failed to add workspace</span>
                  </>
                )}
              </div>
              <OutputConsole lines={wsLines} running={wsState === 'running'} />
              {wsError && (
                <p className="text-[11px] text-destructive bg-destructive/10 rounded px-2 py-1.5 leading-relaxed">
                  {wsError}
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border/30">

          {/* Install CLI footer */}
          {currentPhase === 'install-cli' && installState === 'idle' && !installDone && (
            <>
              <Button variant="ghost" size="sm" className="text-xs" onClick={skipPhase}>
                Skip for now
              </Button>
              <Button size="sm" className="text-xs" onClick={() => void startInstall()}>
                Install
              </Button>
            </>
          )}
          {currentPhase === 'install-cli' && installState === 'idle' && installDone && (
            <Button size="sm" className="text-xs" onClick={() => void advance()}>
              {phaseIdx + 1 < phases.length ? 'Continue' : 'Done'}
            </Button>
          )}
          {currentPhase === 'install-cli' && installState === 'running' && (
            <Button size="sm" variant="ghost" className="text-xs" disabled>
              <Loader2 size={12} className="animate-spin mr-1.5" />
              Installing…
            </Button>
          )}
          {currentPhase === 'install-cli' && installState === 'error' && (
            <>
              <Button variant="ghost" size="sm" className="text-xs" onClick={close}>
                Close
              </Button>
              <Button size="sm" className="text-xs" onClick={() => void startInstall()}>
                Retry
              </Button>
            </>
          )}

          {/* Add workspace footer */}
          {currentPhase === 'add-workspace' && wsState === 'idle' && !hasWorkspaces && (
            <>
              <Button variant="ghost" size="sm" className="text-xs" onClick={skipPhase}>
                Skip for now
              </Button>
              <Button
                size="sm"
                className="text-xs"
                disabled={!wsPath.trim()}
                onClick={() => void startWorkspaceAdd()}
              >
                <PlusCircle size={12} className="mr-1.5" />
                Add workspace
              </Button>
            </>
          )}
          {currentPhase === 'add-workspace' && wsState === 'idle' && hasWorkspaces && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                disabled={!wsPath.trim()}
                onClick={() => void startWorkspaceAdd()}
              >
                <PlusCircle size={12} className="mr-1.5" />
                Add
              </Button>
              <Button size="sm" className="text-xs" onClick={() => void advance()}>
                {phaseIdx + 1 < phases.length ? 'Continue' : 'Done'}
              </Button>
            </>
          )}
          {currentPhase === 'add-workspace' && wsState === 'running' && (
            <Button size="sm" variant="ghost" className="text-xs" disabled>
              <Loader2 size={12} className="animate-spin mr-1.5" />
              Adding…
            </Button>
          )}
          {currentPhase === 'add-workspace' && wsState === 'error' && (
            <>
              <Button variant="ghost" size="sm" className="text-xs" onClick={close}>
                Close
              </Button>
              <Button size="sm" className="text-xs" onClick={() => void startWorkspaceAdd()}>
                Retry
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Backwards-compat alias kept so that any stale import still resolves.
export { SetupWizardModal as InstallWizardModal }
