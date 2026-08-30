import type { StateCreator } from 'zustand'
import type { CliInfo, SetupStatus, UpdateCheck } from '../../types'
import { tauriService } from '../../services/tauri'
import type { AppStore } from '../types'

export interface UpdatesSlice {
  cliInfo: CliInfo | null
  setupStatus: SetupStatus | null
  updateCheck: UpdateCheck | null
  updatesChecking: boolean
  setupWizardOpen: boolean
  setupWizardTriggeredOnce: boolean

  checkCli: () => Promise<void>
  checkSetup: () => Promise<void>
  checkUpdates: () => Promise<void>
  openSetupWizard: () => void
  closeSetupWizard: () => void
  markSetupWizardTriggered: () => void
}

export const createUpdatesSlice: StateCreator<AppStore, [], [], UpdatesSlice> = (set) => ({
  cliInfo: null,
  setupStatus: null,
  updateCheck: null,
  updatesChecking: false,
  setupWizardOpen: false,
  setupWizardTriggeredOnce: false,

  checkCli: async () => {
    try {
      const info = await tauriService.cliCheck()
      set({ cliInfo: info })
    } catch {
      // daemon not available yet
    }
  },

  checkSetup: async () => {
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

  openSetupWizard:        () => set({ setupWizardOpen: true }),
  closeSetupWizard:       () => set({ setupWizardOpen: false }),
  markSetupWizardTriggered: () => set({ setupWizardTriggeredOnce: true }),
})
