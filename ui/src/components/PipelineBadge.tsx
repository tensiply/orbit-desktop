import { useEffect, useRef, useState } from 'react'
import { tauriService } from '../services/tauri'
import type { PipelineStatus, RunStatus } from '../types'
import type { Session } from '../types'

const POLL_INTERVAL_MS = 60_000

interface Props {
  session: Session
}

export function PipelineBadge({ session }: Props) {
  const [pipelines, setPipelines] = useState<PipelineStatus[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const fetch = async () => {
    if (session.global_mode) return
    setLoading(true)
    try {
      const result = await tauriService.getPipelines(
        session.tenant || null,
        session.project || null,
        session.repository || null,
      )
      setPipelines(result)
    } catch {
      // silently ignore — user may not have pipelines configured
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setPipelines([])
    void fetch()
    const id = setInterval(() => { void fetch() }, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.tenant, session.project, session.repository])

  // close panel when clicking outside
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (loading && pipelines.length === 0) return null
  if (pipelines.length === 0) return null

  const overall = worstStatus(pipelines)

  return (
    <div className="relative flex items-center shrink-0" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Pipeline status — click for details"
        className="flex items-center gap-1 h-5 px-1.5 rounded hover:bg-muted/50 transition-colors"
      >
        <StatusDot status={overall} />
        <span className="text-[10px] font-medium text-foreground/40">
          {pipelines.length === 1
            ? pipelines[0].config.name
            : `${pipelines.length} pipelines`}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-7 z-50 w-[340px] rounded-md border border-sidebar-border/60 bg-card shadow-lg text-xs">
          <div className="px-3 py-2 border-b border-sidebar-border/40 text-[11px] font-semibold text-foreground/60">
            Pipelines
          </div>
          <div className="max-h-[400px] overflow-y-auto divide-y divide-sidebar-border/20">
            {pipelines.map((ps, i) => (
              <PipelineRow key={i} ps={ps} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── pipeline row ─────────────────────────────────────────────────────────────

function PipelineRow({ ps }: { ps: PipelineStatus }) {
  const [expanded, setExpanded] = useState(false)
  const run = ps.latest_run
  const status = run?.status ?? 'unknown'

  return (
    <div className="px-3 py-2">
      <div className="flex items-center gap-2">
        <StatusDot status={status} />
        <span className="font-medium text-foreground/80 flex-1">{ps.config.name}</span>
        <span className="text-foreground/35 text-[10px]">{providerLabel(ps.config.provider)}</span>
        {run && run.steps.length > 0 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-foreground/35 hover:text-foreground/60 text-[10px] ml-1"
          >
            {expanded ? '▴' : '▾'}
          </button>
        )}
      </div>

      {ps.error && (
        <p className="mt-1 text-[10px] text-red-400/80 pl-4">{ps.error}</p>
      )}

      {run && (
        <div className="mt-1 pl-4 space-y-0.5">
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

      {expanded && run && run.steps.length > 0 && (
        <div className="mt-2 pl-4 space-y-0.5">
          {run.steps.map((step, i) => (
            <div key={i} className="flex items-start gap-2 text-[10px]">
              <StatusDot status={step.status} size="xs" />
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

function worstStatus(pipelines: PipelineStatus[]): RunStatus {
  const priority: RunStatus[] = ['failure', 'running', 'pending', 'cancelled', 'unknown', 'success']
  let worst: RunStatus = 'unknown'
  for (const ps of pipelines) {
    const s = ps.latest_run?.status ?? (ps.error ? 'failure' : 'unknown')
    if (priority.indexOf(s) < priority.indexOf(worst)) {
      worst = s
    }
  }
  return worst
}

function providerLabel(p: string): string {
  return p === 'github_actions' ? 'GH Actions' : p === 'jenkins' ? 'Jenkins' : p
}

function firstLine(s: string): string {
  return s.split('\n')[0] ?? s
}
