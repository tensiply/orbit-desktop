import type { StateCreator } from 'zustand'
import type { AppStore } from '../types'
import type { PluginInfo } from '../../types'
import { tauriService } from '../../services/tauri'

export interface PluginsSlice {
  plugins: PluginInfo[]
  pluginsLoading: boolean

  fetchPlugins: () => Promise<void>
  // Enable/disable is global today — the backend ignores scope (see orbit_plugin_repo).
  setPluginEnabled: (name: string, enabled: boolean) => Promise<void>
}

export const createPluginsSlice: StateCreator<AppStore, [], [], PluginsSlice> = (set, get) => ({
  plugins: [],
  pluginsLoading: false,

  fetchPlugins: async () => {
    set({ pluginsLoading: true })
    try {
      const plugins = await tauriService.pluginList()
      set({ plugins, pluginsLoading: false })
    } catch {
      set({ pluginsLoading: false })
    }
  },

  setPluginEnabled: async (name, enabled) => {
    // Optimistic: reflect the toggle immediately, revert on failure.
    const prev = get().plugins
    set({ plugins: prev.map((p) => (p.name === name ? { ...p, mcp_enabled: enabled } : p)) })
    try {
      if (enabled) await tauriService.pluginEnable(name, '')
      else await tauriService.pluginDisable(name, '')
    } catch {
      set({ plugins: prev })
    }
  },
})
