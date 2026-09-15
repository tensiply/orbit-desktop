import type { StateCreator } from 'zustand'
import type { AppStore } from '../types'
import type { PluginInfo, ScopeArgs } from '../../types'
import { tauriService } from '../../services/tauri'

export interface PluginsSlice {
  plugins: PluginInfo[]
  pluginsLoading: boolean

  /** Fetch per-scope enablement status for the given scope (all-null → global). */
  fetchPlugins: (scope: ScopeArgs) => Promise<void>
  /**
   * Enable/disable a plugin at `level` (CLI `--scope` value; `null` → global),
   * resolved against `scope`, then refetch status for the same scope.
   */
  setPluginEnabled: (
    name: string,
    enabled: boolean,
    level: string | null,
    scope: ScopeArgs,
  ) => Promise<void>
}

export const createPluginsSlice: StateCreator<AppStore, [], [], PluginsSlice> = (set, get) => ({
  plugins: [],
  pluginsLoading: false,

  fetchPlugins: async (scope) => {
    set({ pluginsLoading: true })
    try {
      const plugins = await tauriService.pluginList(scope)
      set({ plugins, pluginsLoading: false })
    } catch {
      set({ pluginsLoading: false })
    }
  },

  setPluginEnabled: async (name, enabled, level, scope) => {
    try {
      if (enabled) await tauriService.pluginEnable(name, level, scope)
      else await tauriService.pluginDisable(name, level, scope)
    } catch {
      // Surfaced by the refetch below reflecting unchanged state.
    }
    await get().fetchPlugins(scope)
  },
})
