import type { StateCreator } from 'zustand'
import type { AppStore } from '../types'
import { tauriService } from '../../services/tauri'

/** Directory (relative to the scope work_dir) where execution logs are written. */
const ARTIFACT_DIR = '.orbit/executions'
/** File the latest run is captured to, so a session can read it by a stable path. */
const ARTIFACT_FILE = 'last-run.log'

export interface ExecutionDrawerSlice {
  executionDrawerOpen:    boolean
  /** Id of the current run — streamed events carry this so the drawer can match them. */
  executionExecId:        string | null
  /** Logical command shown in the drawer header (e.g. `make build`). */
  executionCommand:       string | null
  /** Absolute path of the artifact the latest run is mirrored to. */
  executionArtifactPath:  string | null

  /** Start streaming `command` for workDir into the drawer, replacing any running exec. */
  runInExecutionDrawer:  (workDir: string, command: string) => Promise<void>
  /** Abort the current run, if any. */
  killExecution:         () => void
  openExecutionDrawer:   () => void
  closeExecutionDrawer:  () => void
}

export const createExecutionDrawerSlice: StateCreator<AppStore, [], [], ExecutionDrawerSlice> = (set, get) => ({
  executionDrawerOpen:    false,
  executionExecId:        null,
  executionCommand:       null,
  executionArtifactPath:  null,

  runInExecutionDrawer: async (workDir, command) => {
    // Abort a previous run so a fast re-trigger doesn't leave two streams alive.
    const prev = get().executionExecId
    if (prev) tauriService.execKill(prev).catch(console.error)

    // Single right-docked drawer at a time — mirror the pipeline drawer behavior.
    get().closeHarnessDrawer()
    get().closeArchDrawer()
    get().closePipelineDrawer()
    get().closeDrawer()

    const execId = crypto.randomUUID()
    const artifactPath = `${workDir}/${ARTIFACT_DIR}/${ARTIFACT_FILE}`

    // Set execId before invoking: the drawer's listeners are already mounted and
    // filter on this id, so no early output is lost between spawn and render.
    set({
      executionDrawerOpen:   true,
      executionExecId:       execId,
      executionCommand:      command,
      executionArtifactPath: artifactPath,
    })

    await tauriService.execRun(execId, workDir, command, artifactPath)
  },

  killExecution: () => {
    const id = get().executionExecId
    if (id) tauriService.execKill(id).catch(console.error)
  },

  openExecutionDrawer: () => {
    get().closeHarnessDrawer()
    get().closeArchDrawer()
    get().closePipelineDrawer()
    get().closeDrawer()
    set({ executionDrawerOpen: true })
  },

  closeExecutionDrawer: () => set({ executionDrawerOpen: false }),
})
