import { RefreshCw } from 'lucide-react'
import { Drawer } from './ui/drawer'
import { useAppStore } from '../store'
import { PipelineCard } from './pipelineUi'

export function PipelineDrawer() {
  const open       = useAppStore((s) => s.pipelineDrawerOpen)
  const pipelines  = useAppStore((s) => s.pipelines)
  const loading    = useAppStore((s) => s.pipelinesLoading)
  const close      = useAppStore((s) => s.closePipelineDrawer)
  const refresh    = useAppStore((s) => s.refreshPipelines)

  return (
    <Drawer
      open={open}
      onClose={close}
      title="Pipelines"
      zone="orbit.desktop.drawer.pipelines"
      className="bg-card"
      width={360}
    >
      <div className="flex items-center h-[30px] px-3 border-b border-sidebar-border/40 shrink-0">
        <span className="text-[11px] text-foreground/40 flex-1">
          {pipelines.length} pipeline{pipelines.length === 1 ? '' : 's'}
        </span>
        <button
          onClick={() => void refresh()}
          disabled={loading}
          title="Refresh"
          className="p-1 rounded-md text-foreground/35 hover:text-foreground/70 hover:bg-foreground/5 disabled:opacity-50 transition-colors"
          aria-label="Refresh pipelines"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 text-xs">
        {pipelines.length === 0 && !loading && (
          <p className="text-[11px] text-foreground/35 px-1 py-2">No pipelines configured for this scope.</p>
        )}
        {pipelines.map((ps, i) => (
          <PipelineCard key={i} ps={ps} />
        ))}
      </div>
    </Drawer>
  )
}
