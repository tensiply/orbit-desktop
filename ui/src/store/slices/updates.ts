import type { StateCreator } from 'zustand'
import type { CliInfo, UpdateCheck } from '../../types'
import { tauriService } from '../../services/tauri'
import type { AppStore } from '../types'

export interface UpdatesSlice {
  cliInfo: CliInfo | null
  updateCheck: UpdateCheck | null
  updatesChecking: boolean
  installWizardOpen: boolean
  installWizardTriggeredOnce: boolean

  checkCli: () => Promise<void>
  checkUpdates: () => Promise<void>
  openInstallWizard: () => void
  closeInstallWizard: () => void
  markInstallWizardTriggered: () => void
}

export const createUpdatesSlice: StateCreator<AppStore, [], [], UpdatesSlice> = (set, get) => ({
  cliInfo: null,
  updateCheck: null,
  updatesChecking: false,
  installWizardOpen: false,
  installWizardTriggeredOnce: false,

  checkCli: async () => {
    try {
      const info = await tauriService.cliCheck()
      set({ cliInfo: info })
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

  openInstallWizard: () => set({ installWizardOpen: true }),
  closeInstallWizard: () => set({ installWizardOpen: false }),
  markInstallWizardTriggered: () => set({ installWizardTriggeredOnce: true }),
})
