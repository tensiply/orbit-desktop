import { useEffect } from 'react'
import { useAppStore } from '../store'
import { USE_PIPELINE_MOCKS, MOCK_PIPELINES } from '../components/pipelineMocks'
import type { PipelineStatus, Session } from '../types'

const POLL_INTERVAL_MS = 60_000

/**
 * Fetches and polls the pipelines for a session's scope, returning the current
 * list (mocks included). Lifted out of PipelineBadge so a parent can gate the
 * badge's visibility on `pipelines.length > 0`.
 */
export function usePipelines(session: Session): PipelineStatus[] {
  const selectedWorkspace = useAppStore((s) => s.selectedWorkspace)
  const storePipelines    = useAppStore((s) => s.pipelines)
  const fetchPipelines    = useAppStore((s) => s.fetchPipelines)
  const refreshPipelines  = useAppStore((s) => s.refreshPipelines)

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

  return USE_PIPELINE_MOCKS ? MOCK_PIPELINES : storePipelines
}
