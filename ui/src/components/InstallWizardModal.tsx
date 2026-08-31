import { useState, useEffect, Fragment } from 'react'
import {
  Package, Terminal, Monitor, Cpu, FolderOpen, Check, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { useAppStore } from '../store'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog'
import { Button } from './ui/button'
import { CliStep, DesktopStep, EnginesStep, WorkspacesStep } from './SetupOrbitView'
import { cn } from '@/lib/utils'

// ── Step definitions ───────────────────────────────────────────────────────────

const STEPS = [
  {
    id:          'cli',
    label:       'CLI',
    icon:        <Terminal size={14} />,
    headline:    'Install the Orbit CLI',
    description: 'The CLI is the backbone of Orbit — it runs sessions, manages workspaces, and coordinates engines. The desktop app is just a shell; without the CLI nothing executes.',
    required:    true,
    component:   CliStep,
  },
  {
    id:          'desktop',
    label:       'Desktop',
    icon:        <Monitor size={14} />,
    headline:    'Keep the desktop app updated',
    description: "You're already running it. Updates bring new features and fixes — Orbit Desktop downloads as a new release rather than auto-updating.",
    required:    false,
    component:   DesktopStep,
  },
  {
    id:          'engines',
    label:       'Engines',
    icon:        <Cpu size={14} />,
    headline:    'Choose your AI engine',
    description: "Engines are the AI models that power your sessions. Set a default so Orbit knows which one to launch. Each engine's CLI must be installed separately on your system.",
    required:    false,
    component:   EnginesStep,
  },
  {
    id:          'workspaces',
    label:       'Workspaces',
    icon:        <FolderOpen size={14} />,
    headline:    'Register a workspace',
    description: 'Workspaces are root directories where Orbit organizes your projects. Register at least one so Orbit loads the right context — governance files, MCP configs, and scope hierarchy — automatically.',
    required:    true,
    component:   WorkspacesStep,
  },
] as const

type StepId = typeof STEPS[number]['id']

// ── Step indicator ─────────────────────────────────────────────────────────────

function StepIndicator({
  idx,
  label,
  state,
  onClick,
}: {
  idx: number
  label: string
  state: 'done' | 'active' | 'pending'
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 group outline-none"
    >
      <div className={cn(
        'w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all',
        state === 'done'
          ? 'border-primary bg-primary text-primary-foreground'
          : state === 'active'
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border/40 bg-transparent text-muted-foreground/30 group-hover:border-border/70 group-hover:text-muted-foreground/50',
      )}>
        {state === 'done'
          ? <Check size={12} strokeWidth={2.5} />
          : <span className="text-[11px] font-semibold leading-none">{idx + 1}</span>
        }
      </div>
      <span className={cn(
        'text-[10px] font-medium leading-none transition-colors',
        state === 'active'  ? 'text-foreground/80' :
        state === 'done'    ? 'text-foreground/50' :
                              'text-foreground/25 group-hover:text-foreground/40',
      )}>
        {label}
      </span>
    </button>
  )
}

// ── Main modal ─────────────────────────────────────────────────────────────────

export function SetupWizardModal() {
  const open         = useAppStore((s) => s.setupWizardOpen)
  const close        = useAppStore((s) => s.closeSetupWizard)
  const checkCli     = useAppStore((s) => s.checkCli)
  const checkSetup   = useAppStore((s) => s.checkSetup)
  const checkUpdates = useAppStore((s) => s.checkUpdates)

  const [stepIdx, setStepIdx] = useState(0)

  useEffect(() => {
    if (open) {
      setStepIdx(0)
      void Promise.all([checkCli(), checkSetup(), checkUpdates()])
    }
  }, [open])

  const step     = STEPS[stepIdx]
  const isFirst  = stepIdx === 0
  const isLast   = stepIdx === STEPS.length - 1
  const StepComp = step.component

  const stepState = (idx: number): 'done' | 'active' | 'pending' => {
    if (idx < stepIdx)   return 'done'
    if (idx === stepIdx) return 'active'
    return 'pending'
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close() }}>
      <DialogContent
        data-orbit-zone="orbit.desktop.modal.setup-wizard"
        className="max-w-[500px] h-[580px] max-h-[90vh] p-0 gap-0 rounded-xl flex flex-col overflow-hidden"
      >
        {/* ── Header ──────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border/50 shrink-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
            <Package size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <DialogTitle className="text-sm font-semibold leading-none">
              Setup Orbit
            </DialogTitle>
            <DialogDescription className="text-[11px] text-muted-foreground/60 mt-0.5 leading-none">
              Step {stepIdx + 1} of {STEPS.length}
              {!step.required && <span className="ml-1 text-muted-foreground/40">· optional</span>}
            </DialogDescription>
          </div>
        </div>

        {/* ── Stepper ─────────────────────────────────────────────────────────── */}
        <div className="flex items-start px-5 py-3 border-b border-border/30 bg-muted/10 shrink-0">
          {STEPS.map((s, idx) => (
            <Fragment key={s.id}>
              <StepIndicator
                idx={idx}
                label={s.label}
                state={stepState(idx)}
                onClick={() => setStepIdx(idx)}
              />
              {idx < STEPS.length - 1 && (
                <div className={cn(
                  'flex-1 h-px mt-[13px] mx-1.5 rounded-full transition-colors',
                  idx < stepIdx ? 'bg-primary/40' : 'bg-border/30',
                )} />
              )}
            </Fragment>
          ))}
        </div>

        {/* ── Content ─────────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="px-5 pt-4 pb-6 space-y-4">
            {/* Step context */}
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 shrink-0 text-primary/60">{step.icon}</span>
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-foreground leading-snug">
                  {step.headline}
                </p>
                <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px w-full bg-border/20" />

            {/* Step component */}
            <StepComp />
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border/30 bg-muted/10 shrink-0">
          {/* Back — invisible on first step to maintain layout */}
          <Button
            variant="ghost"
            size="sm"
            className={cn('text-xs gap-1', isFirst && 'invisible')}
            onClick={() => setStepIdx((i) => i - 1)}
            tabIndex={isFirst ? -1 : undefined}
          >
            <ChevronLeft size={13} />
            Back
          </Button>

          {/* Skip / Next / Done */}
          <div className="flex items-center gap-2">
            {!step.required && !isLast && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground/50 hover:text-muted-foreground"
                onClick={() => setStepIdx((i) => i + 1)}
              >
                Skip
              </Button>
            )}
            {isLast ? (
              <Button size="sm" className="text-xs gap-1 min-w-[80px]" onClick={close}>
                Done
              </Button>
            ) : (
              <Button
                size="sm"
                className="text-xs gap-1 min-w-[80px]"
                onClick={() => setStepIdx((i) => i + 1)}
              >
                Next
                <ChevronRight size={13} />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Backwards-compat alias
export { SetupWizardModal as InstallWizardModal }
