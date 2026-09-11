import { useEffect } from 'react'
import { useAppStore } from '../store'
import { StatusCircle, statusOf } from './pipelineUi'
import type { Session } from '../types'

const POLL_INTERVAL_MS = 60_000

interface Props {
  session: Session
}

export function PipelineBadge({ session }: Props) {
  const selectedWorkspace  = useAppStore((s) => s.selectedWorkspace)
  const pipelines          = useAppStore((s) => s.pipelines)
  const loading            = useAppStore((s) => s.pipelinesLoading)
  const fetchPipelines     = useAppStore((s) => s.fetchPipelines)
  const refreshPipelines   = useAppStore((s) => s.refreshPipelines)
  const openPipelineDrawer = useAppStore((s) => s.openPipelineDrawer)

  useEffect(() => {
    if (session.global_mode) return
    void fetchPipelines({
      workspace: selectedWorkspace,
      tenant: session.tenant || null,
      project: session.project || null,
      repository: session.repository || null,
    })
    const id = setInterval(() => { void refreshPipelines() }, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWorkspace, session.tenant, session.project, session.repository, session.global_mode])

  if (loading && pipelines.length === 0) return null
  if (pipelines.length === 0) return null

  return (
    <button
      onClick={openPipelineDrawer}
      title="Pipeline status — click for details"
      className="flex items-center gap-1 h-5 px-1.5 rounded hover:bg-muted/50 transition-colors shrink-0"
    >
      {pipelines.map((ps, i) => (
        <StatusCircle
          key={i}
          status={statusOf(ps)}
          label={`${ps.config.name} — ${statusOf(ps)}`}
        />
      ))}
    </button>
  )
}
