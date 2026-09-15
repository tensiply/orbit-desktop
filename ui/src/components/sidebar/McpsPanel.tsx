import type { PluginInfo } from '../../types'
import { useAppStore } from '../../store'

// ── Switch ──────────────────────────────────────────────────────────────────

function Switch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className={`shrink-0 relative w-6 h-3.5 rounded-full transition-colors ${
        on ? 'bg-green-500/70' : 'bg-sidebar-foreground/20'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-2.5 h-2.5 rounded-full bg-white transition-transform ${
          on ? 'translate-x-2.5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

// ── McpItem ───────────────────────────────────────────────────────────────────

function McpItem({ plugin }: { plugin: PluginInfo }) {
  const setPluginEnabled = useAppStore((s) => s.setPluginEnabled)
  return (
    <li className="rounded-md px-2 py-1.5 text-sidebar-foreground/60 hover:bg-sidebar-accent/60 transition-colors">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium truncate flex-1">{plugin.name}</span>
        <Switch on={plugin.mcp_enabled} onToggle={() => void setPluginEnabled(plugin.name, !plugin.mcp_enabled)} />
      </div>
      {plugin.description && (
        <p className="text-[10px] text-sidebar-foreground/35 leading-snug mt-0.5">{plugin.description}</p>
      )}
    </li>
  )
}

// ── McpsPanel ─────────────────────────────────────────────────────────────────

export function McpsPanel() {
  const plugins = useAppStore((s) => s.plugins)
  const loading = useAppStore((s) => s.pluginsLoading)

  const mcpPlugins = plugins.filter((p) => p.has_mcp)

  if (loading && plugins.length === 0) {
    return <p className="text-[10px] text-sidebar-foreground/25 px-3 pt-1 italic">Loading…</p>
  }
  if (mcpPlugins.length === 0) {
    return <p className="text-[10px] text-sidebar-foreground/25 px-3 pt-1 italic">No MCP servers available</p>
  }

  return (
    <div className="flex-1 overflow-y-auto min-h-0 px-1 pt-1 pb-2">
      <ul className="list-none p-0 m-0 space-y-px">
        {mcpPlugins.map((p) => <McpItem key={p.name} plugin={p} />)}
      </ul>
    </div>
  )
}
