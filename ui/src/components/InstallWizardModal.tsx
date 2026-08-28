import { useState, useEffect, useRef } from 'react'
import { listen } from '@tauri-apps/api/event'
import {
  CheckCircle2, Circle, Loader2, Terminal, Package, AlertCircle,
} from 'lucide-react'
import { useAppStore } from '../store'
import { tauriService } from '../services/tauri'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog'
import { Button } from './ui/button'

// ── Types ──────────────────────────────────────────────────────────────────────

type Step = 'choose' | 'installing' | 'done' | 'error'
type Method = 'cargo' | 'brew'

// ── Step indicator ─────────────────────────────────────────────────────────────

function StepDot({
  state,
  label,
}: {
  state: 'pending' | 'active' | 'done'
  label: string
}) {
  return (
    <div className="flex items-center gap-2">
      {state === 'done' && <CheckCircle2 size={14} className="text-primary shrink-0" />}
      {state === 'active' && <Loader2 size={14} className="text-primary animate-spin shrink-0" />}
      {state === 'pending' && <Circle size={14} className="text-foreground/20 shrink-0" />}
      <span
        className={`text-xs ${
          state === 'active'
            ? 'text-foreground font-medium'
            : state === 'done'
            ? 'text-foreground/60'
            : 'text-foreground/30'
        }`}
      >
        {label}
      </span>
    </div>
  )
}

// ── Main wizard ────────────────────────────────────────────────────────────────

export function InstallWizardModal() {
  const open             = useAppStore((s) => s.installWizardOpen)
  const close            = useAppStore((s) => s.closeInstallWizard)
  const checkCli         = useAppStore((s) => s.checkCli)

  const [step, setStep]           = useState<Step>('choose')
  const [method, setMethod]       = useState<Method>('cargo')
  const [outputLines, setOutput]  = useState<string[]>([])
  const [error, setError]         = useState<string | null>(null)
  const outputRef                 = useRef<HTMLDivElement>(null)

  // Reset state when the modal opens
  useEffect(() => {
    if (open) {
      setStep('choose')
      setOutput([])
      setError(null)
    }
  }, [open])

  // Auto-scroll output
  useEffect(() => {
    const el = outputRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [outputLines])

  const startInstall = async () => {
    setStep('installing')
    setOutput([])
    setError(null)

    const unlisten = await listen<string>('cli_install_output', (ev) => {
      setOutput((prev) => [...prev, ev.payload])
    })

    try {
      await tauriService.cliInstall(method)
      setStep('done')
      // Refresh CLI info in the store so the badge disappears
      await checkCli()
    } catch (e) {
      setError(String(e))
      setStep('error')
    } finally {
      unlisten()
    }
  }

  const stepState = (s: Step): 'pending' | 'active' | 'done' => {
    const order: Step[] = ['choose', 'installing', 'done']
    const current = order.indexOf(step)
    const target  = order.indexOf(s)
    if (current > target) return 'done'
    if (current === target) return 'active'
    return 'pending'
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && step !== 'installing') close() }}>
      <DialogContent
        data-orbit-zone="orbit.desktop.modal.install-wizard"
        className="max-w-[480px] p-0 overflow-hidden gap-0 rounded-xl"
      >
        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <Package size={15} className="text-primary shrink-0" />
            <DialogTitle className="text-sm font-semibold leading-none">
              Install Orbit CLI
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs mt-1 text-foreground/50">
            The orbit CLI is required to launch and manage AI sessions.
          </DialogDescription>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-4 px-5 py-2.5 border-b border-border/30 bg-foreground/2">
          <StepDot state={stepState('choose')} label="Choose method" />
          <div className="h-px flex-1 bg-foreground/10" />
          <StepDot state={step === 'installing' ? 'active' : stepState('installing')} label="Install" />
          <div className="h-px flex-1 bg-foreground/10" />
          <StepDot state={stepState('done')} label="Done" />
        </div>

        {/* Body */}
        <div className="px-5 py-4 min-h-[200px] flex flex-col gap-3">

          {step === 'choose' && (
            <>
              <p className="text-xs text-foreground/60 leading-relaxed">
                Choose how to install the Orbit CLI on this machine.
              </p>

              <div className="flex flex-col gap-2 mt-1">
                {/* cargo */}
                <button
                  onClick={() => setMethod('cargo')}
                  className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border transition-colors text-left ${
                    method === 'cargo'
                      ? 'border-primary/60 bg-primary/5'
                      : 'border-border hover:border-border/80 hover:bg-foreground/3'
                  }`}
                >
                  <div className="mt-0.5 w-3 h-3 rounded-full border-2 shrink-0 flex items-center justify-center border-primary">
                    {method === 'cargo' && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      cargo install orbit
                    </p>
                    <p className="text-[11px] text-foreground/45 mt-0.5">
                      Recommended — builds from source. Requires Rust toolchain.
                    </p>
                  </div>
                </button>

                {/* brew */}
                <button
                  onClick={() => setMethod('brew')}
                  className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border transition-colors text-left ${
                    method === 'brew'
                      ? 'border-primary/60 bg-primary/5'
                      : 'border-border hover:border-border/80 hover:bg-foreground/3'
                  }`}
                >
                  <div className="mt-0.5 w-3 h-3 rounded-full border-2 shrink-0 flex items-center justify-center border-primary">
                    {method === 'brew' && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      brew install tensiply/tap/orbit
                    </p>
                    <p className="text-[11px] text-foreground/45 mt-0.5">
                      macOS only — requires Homebrew. No Rust required.
                    </p>
                  </div>
                </button>
              </div>

              <div className="mt-1 p-2.5 rounded-lg bg-foreground/4 flex items-start gap-2">
                <Terminal size={12} className="text-foreground/35 mt-0.5 shrink-0" />
                <code className="text-[11px] font-mono text-foreground/50">
                  {method === 'cargo'
                    ? 'cargo install orbit --locked'
                    : 'brew install tensiply/tap/orbit'}
                </code>
              </div>
            </>
          )}

          {(step === 'installing' || step === 'error') && (
            <>
              <div className="flex items-center gap-2">
                {step === 'installing' && (
                  <>
                    <Loader2 size={12} className="animate-spin text-primary shrink-0" />
                    <span className="text-xs text-foreground/60">Installing via {method}…</span>
                  </>
                )}
                {step === 'error' && (
                  <>
                    <AlertCircle size={12} className="text-destructive shrink-0" />
                    <span className="text-xs text-destructive">Installation failed</span>
                  </>
                )}
              </div>

              <div
                ref={outputRef}
                className="flex-1 min-h-[120px] max-h-[160px] overflow-y-auto rounded-lg bg-black/60 p-2.5 font-mono text-[10px] text-green-400/80 leading-relaxed"
              >
                {outputLines.length === 0 && step === 'installing' && (
                  <span className="text-foreground/30">Starting…</span>
                )}
                {outputLines.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>

              {error && (
                <p className="text-[11px] text-destructive bg-destructive/10 rounded px-2 py-1.5 leading-relaxed">
                  {error}
                </p>
              )}
            </>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center justify-center gap-3 py-4">
              <CheckCircle2 size={36} className="text-primary" />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Orbit CLI installed</p>
                <p className="text-xs text-foreground/50 mt-0.5">
                  You can now launch and manage AI sessions from the desktop.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border/30">
          {step === 'choose' && (
            <>
              <Button variant="ghost" size="sm" className="text-xs" onClick={close}>
                Skip for now
              </Button>
              <Button size="sm" className="text-xs" onClick={() => void startInstall()}>
                Install
              </Button>
            </>
          )}
          {step === 'installing' && (
            <Button size="sm" variant="ghost" className="text-xs" disabled>
              <Loader2 size={12} className="animate-spin mr-1.5" />
              Installing…
            </Button>
          )}
          {step === 'error' && (
            <>
              <Button variant="ghost" size="sm" className="text-xs" onClick={close}>
                Close
              </Button>
              <Button size="sm" className="text-xs" onClick={() => void startInstall()}>
                Retry
              </Button>
            </>
          )}
          {step === 'done' && (
            <Button size="sm" className="text-xs" onClick={close}>
              Done
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
