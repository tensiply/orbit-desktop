import { CheckCircle2, Circle, Server, ArrowUp } from 'lucide-react'
import type { PluginInfo } from '../../types'
import { useAppStore } from '../../store'
import { scopeDisplayLevel } from '../../domain/scope'
import { MarkerSeparator } from '../ui/marker-separator'
import { ScopeNavigator } from './ScopePanel'

// ── PluginItem ──────────────────────────────────────────────────────────────

function PluginItem({ plugin, level }: { plugin: PluginInfo; level: string }) {
  const setHere = plugin.enabled_here === level
  const inherited = plugin.enabled_effective && !setHere

  return (
    <li className="rounded-md px-2 py-1.5 text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground transition-colors">
      <div className="flex items-center gap-1.5">
        {plugin.installed
          ? <CheckCircle2 size={12} className="text-green-500/70 shrink-0" />
          : <Circle       size={12} className="text-sidebar-foreground/20 shrink-0" />}
        <span className="text-xs font-medium truncate flex-1">{plugin.name}</span>
        {plugin.has_mcp && (
          <span className="shrink-0 flex items-center gap-0.5 text-[8px] font-medium uppercase tracking-wide px-1 py-px rounded bg-sidebar-foreground/10 text-sidebar-foreground/40">
            <Server size={8} />mcp
          </span>
        )}
        {setHere && (
          <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-green-500/80" title={`enabled at ${level}`} />
        )}
        {inherited && (
          <span className="shrink-0 flex items-center gap-0.5 text-[8px] text-sidebar-foreground/35" title={`inherited from ${plugin.enabled_here}`}>
            <ArrowUp size={8} />{plugin.enabled_here}
          </span>
        )}
      </div>
      {plugin.description && (
        <p className="pl-[18px] text-[10px] text-sidebar-foreground/35 leading-snug mt-0.5">{plugin.description}</p>
      )}
    </li>
  )
}

// ── PluginsPanel ──────────────────────────────────────────────────────────────

export function PluginsPanel() {
  const plugins          = useAppStore((s) => s.plugins)
  const loading          = useAppStore((s) => s.pluginsLoading)
  const scopePath        = useAppStore((s) => s.scopePath)
  const selectedWorkspace = useAppStore((s) => s.selectedWorkspace)

  const fullPath = selectedWorkspace ? [selectedWorkspace, ...scopePath] : scopePath
  const level = scopeDisplayLevel(fullPath) ?? 'global'

  // Group by category, preserving first-seen order.
  const categories: string[] = []
  const byCategory = new Map<string, PluginInfo[]>()
  for (const p of plugins) {
    const cat = p.category || 'other'
    if (!byCategory.has(cat)) { byCategory.set(cat, []); categories.push(cat) }
    byCategory.get(cat)!.push(p)
  }

  return (
    <>
      <ScopeNavigator selectedFolderName={null} folderMenu="none" />
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading && plugins.length === 0 && (
          <p className="text-[10px] text-sidebar-foreground/25 px-3 pt-1 italic">Loading…</p>
        )}
        {!loading && plugins.length === 0 && (
          <p className="text-[10px] text-sidebar-foreground/25 px-3 pt-1 italic">No plugins found</p>
        )}
        {categories.map((cat) => (
          <div key={cat} className="px-1 pt-1 pb-2">
            <div className="px-1">
              <MarkerSeparator label={cat} />
            </div>
            <ul className="list-none p-0 m-0 space-y-px">
              {byCategory.get(cat)!.map((p) => <PluginItem key={p.name} plugin={p} level={level} />)}
            </ul>
          </div>
        ))}
      </div>
    </>
  )
}
