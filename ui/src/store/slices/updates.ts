import type { StateCreator } from 'zustand'
import type { SetupStatus, UpdateCheck } from '../../types'
import { tauriService } from '../../services/tauri'
import { installDesktopUpdate } from '../../services/updater'
import type { AppStore } from '../types'

// When VITE_FORCE_SETUP_WIZARD=true the wizard opens immediately with both
// phases active and checkSetup becomes a no-op so the real system state
// never overwrites the forced status. Useful for visual testing in dev.
const FORCE_WIZARD = import.meta.env.VITE_FORCE_SETUP_WIZARD === 'true'
const FORCED_STATUS: SetupStatus = { has_workspaces: false }

export interface UpdatesSlice {
  setupStatus: SetupStatus | null
  updateCheck: UpdateCheck | null
  updatesChecking: boolean
  desktopUpdating: boolean
  desktopUpdateError: string | null
  setupWizardOpen: boolean
  setupWizardTriggeredOnce: boolean

  checkSetup: () => Promise<void>
  checkUpdates: () => Promise<void>
  installDesktop: () => Promise<void>
  openSetupWizard: () => void
  closeSetupWizard: () => void
  markSetupWizardTriggered: () => void
}

export const createUpdatesSlice: StateCreator<AppStore, [], [], UpdatesSlice> = (set) => ({
  setupStatus: FORCE_WIZARD ? FORCED_STATUS : null,
  updateCheck: null,
  updatesChecking: false,
  desktopUpdating: false,
  desktopUpdateError: null,
  setupWizardOpen: FORCE_WIZARD,
  setupWizardTriggeredOnce: false,

  checkSetup: async () => {
    if (FORCE_WIZARD) return
    try {
      const status = await tauriService.setupCheck()
      set({ setupStatus: status })
    } catch {
      // daemon not available yet
    }
  },

  checkUpdates: async () => {
    set({ updatesChecking: true })
    try {
      const result = await tauriService.checkUpdates()
      set({ updateCheck: result, updatesChecking: false })
    } catch {
      set({ updatesChecking: false })
    }
  },

  installDesktop: async () => {
    set({ desktopUpdating: true, desktopUpdateError: null })
    try {
      // Downloads, verifies the signature, installs, and relaunches — may not return.
      await installDesktopUpdate()
    } catch (e) {
      set({ desktopUpdating: false, desktopUpdateError: String(e) })
    }
  },

  openSetupWizard:          () => set({ setupWizardOpen: true }),
  closeSetupWizard:         () => set({ setupWizardOpen: false }),
  markSetupWizardTriggered: () => set({ setupWizardTriggeredOnce: true }),
})
