import { StatusCircle, statusOf } from './pipelineUi'
import type { PipelineStatus } from '../types'

interface Props {
  pipelines: PipelineStatus[]
  onClick: () => void
}

export function PipelineBadge({ pipelines, onClick }: Props) {
  if (pipelines.length === 0) return null

  return (
    <button
      onClick={onClick}
      title="Pipeline status — click for details"
      aria-label="Pipeline status — click for details"
      className="flex items-center gap-1 py-1 px-2 rounded-md shrink-0 transition-colors hover:bg-sidebar-accent/40"
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
