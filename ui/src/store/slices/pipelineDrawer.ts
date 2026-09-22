import type { StateCreator } from 'zustand'
import type { PipelineStatus } from '../../types'
import type { AppStore } from '../types'
import { tauriService } from '../../services/tauri'

interface PipelineScope {
  workspace: string | null
  tenant: string | null
  project: string | null
  repository: string | null
}

export interface PipelineDrawerSlice {
  pipelineDrawerOpen: boolean
  pipelines: PipelineStatus[]
  pipelinesLoading: boolean
  pipelineScope: PipelineScope | null

  /** Fetch pipelines for a scope and cache both results and scope. */
  fetchPipelines: (scope: PipelineScope) => Promise<void>
  /** Re-fetch using the last scope passed to fetchPipelines. */
  refreshPipelines: () => Promise<void>
  openPipelineDrawer: () => void
  closePipelineDrawer: () => void
}

export const createPipelineDrawerSlice: StateCreator<AppStore, [], [], PipelineDrawerSlice> = (set, get) => ({
  pipelineDrawerOpen: false,
  pipelines: [],
  pipelinesLoading: false,
  pipelineScope: null,

  fetchPipelines: async (scope) => {
    set({ pipelinesLoading: true, pipelineScope: scope })
    try {
      const result = await tauriService.getPipelines(
        scope.workspace,
        scope.tenant,
        scope.project,
        scope.repository,
      )
      set({ pipelines: result, pipelinesLoading: false })
    } catch {
      // silently ignore — user may not have pipelines configured
      set({ pipelinesLoading: false })
    }
  },

  refreshPipelines: async () => {
    const scope = get().pipelineScope
    if (!scope) return
    await get().fetchPipelines(scope)
  },

  openPipelineDrawer: () => {
    // Single right-docked drawer at a time — mirror the terminal drawer behavior.
    get().closeHarnessDrawer()
    get().closeArchDrawer()
    get().closeDrawer()
    set({ pipelineDrawerOpen: true })
  },

  closePipelineDrawer: () => set({ pipelineDrawerOpen: false }),
})
