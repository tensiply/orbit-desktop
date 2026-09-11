import { useState } from 'react'
import { Check, X, Loader2 } from 'lucide-react'
import type { PipelineStatus, RunStatus } from '../types'

// ── pipeline card ────────────────────────────────────────────────────────────

export function PipelineCard({ ps }: { ps: PipelineStatus }) {
  const [expanded, setExpanded] = useState(false)
  const run = ps.latest_run
  const status = statusOf(ps)
  const hasSteps = !!run && run.steps.length > 0

  return (
    <div className="rounded-md border border-sidebar-border/50 bg-background/40 px-2.5 py-2">
      <button
        onClick={() => hasSteps && setExpanded((v) => !v)}
        className={`flex w-full items-center gap-2 text-left ${hasSteps ? '' : 'cursor-default'}`}
      >
        <StatusDot status={status} />
        <span className="font-medium text-foreground/80 flex-1 truncate">{ps.config.name}</span>
        <span className="text-foreground/35 text-[10px]">{providerLabel(ps.config.provider)}</span>
        {hasSteps && (
          <span className="text-foreground/35 text-[10px] ml-1">{expanded ? '▴' : '▾'}</span>
        )}
      </button>

      {ps.error && (
        <p className="mt-1 text-[10px] text-red-400/80 pl-4">{ps.error}</p>
      )}

      {!run && !ps.error && (
        <p className="mt-1 text-[10px] text-foreground/35 pl-4">no runs found</p>
      )}

      {run && (
        <div className="mt-1.5 pl-4 space-y-0.5">
          <div className="flex items-center gap-2 text-[10px] text-foreground/40">
            <StatusLabel status={run.status} />
            {run.branch && <span>· {run.branch}</span>}
            {run.triggered_by && <span>· {run.triggered_by}</span>}
          </div>
          {run.commit_message && (
            <p className="text-[10px] text-foreground/35 truncate">
              {firstLine(run.commit_message)}
            </p>
          )}
          {run.url && (
            <a
              href={run.url}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-blue-400/60 hover:text-blue-400/90 underline-offset-2 hover:underline"
            >
              View run ↗
            </a>
          )}
        </div>
      )}

      {expanded && hasSteps && (
        <div className="mt-2 pl-4 pt-2 border-t border-sidebar-border/30 space-y-0.5">
          {run!.steps.map((step, i) => (
            <div key={i} className="flex items-start gap-2 text-[10px]">
              <span className="mt-[3px]"><StatusDot status={step.status} size="xs" /></span>
              <span className={`text-foreground/50 ${step.status === 'failure' ? 'text-red-400/80' : ''}`}>
                {step.name}
              </span>
              {step.message && (
                <span className="text-red-400/60 truncate">{step.message}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── status primitives ─────────────────────────────────────────────────────────

function StatusDot({ status, size = 'sm' }: { status: RunStatus; size?: 'xs' | 'sm' }) {
  const sz = size === 'xs' ? 'h-1.5 w-1.5' : 'h-2 w-2'
  return (
    <span
      className={`${sz} rounded-full shrink-0 ${dotColor(status)} ${status === 'running' ? 'animate-pulse' : ''}`}
    />
  )
}

function StatusLabel({ status }: { status: RunStatus }) {
  return <span className={statusTextColor(status)}>{status}</span>
}

/** Outlined circle whose border + icon carry the status color (check / x). */
export function StatusCircle({ status, label }: { status: RunStatus; label: string }) {
  return (
    <span
      title={label}
      className={`inline-flex h-4 w-4 items-center justify-center rounded-full border shrink-0 bg-transparent opacity-70 transition-opacity hover:opacity-100 ${circleColor(status)}`}
    >
      {status === 'success' && <Check size={10} strokeWidth={3} />}
      {(status === 'failure' || status === 'cancelled') && <X size={10} strokeWidth={3} />}
      {status === 'running' && <Loader2 size={10} strokeWidth={3} className="animate-spin" />}
    </span>
  )
}

function circleColor(s: RunStatus): string {
  switch (s) {
    case 'success':   return 'border-green-500 text-green-500'
    case 'failure':   return 'border-red-500 text-red-500'
    case 'running':   return 'border-yellow-400 text-yellow-400'
    default:          return 'border-foreground/25 text-foreground/40'
  }
}

function dotColor(s: RunStatus): string {
  switch (s) {
    case 'success':   return 'bg-green-500'
    case 'failure':   return 'bg-red-500'
    case 'running':   return 'bg-yellow-400'
    case 'pending':   return 'bg-foreground/20'
    case 'cancelled': return 'bg-foreground/20'
    default:          return 'bg-foreground/15'
  }
}

function statusTextColor(s: RunStatus): string {
  switch (s) {
    case 'success':   return 'text-green-500/80'
    case 'failure':   return 'text-red-400/80'
    case 'running':   return 'text-yellow-400/80'
    default:          return 'text-foreground/40'
  }
}

// ── utilities ─────────────────────────────────────────────────────────────────

/** Effective status of a pipeline: the latest run's status, or failure on error. */
export function statusOf(ps: PipelineStatus): RunStatus {
  return ps.latest_run?.status ?? (ps.error ? 'failure' : 'unknown')
}

function providerLabel(p: string): string {
  return p === 'github_actions' ? 'GH Actions' : p === 'jenkins' ? 'Jenkins' : p
}

function firstLine(s: string): string {
  return s.split('\n')[0] ?? s
}
