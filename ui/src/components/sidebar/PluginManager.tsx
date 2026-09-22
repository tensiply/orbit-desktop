import { CheckCircle2, Circle, XCircle, ArrowUp, Download, Loader2, Server } from 'lucide-react'
import type { PluginInfo, ScopeArgs } from '../../types'
import { useAppStore } from '../../store'
import { scopeArgsFromPath, scopeDisplayLevel, scopeCliLevel } from '../../domain/scope'
import { MarkerSeparator } from '../ui/marker-separator'
import { ScopeNavigator } from './ScopePanel'

// ── shared bits ───────────────────────────────────────────────────────────────

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

function Section({ label, count, children }: { label: string; count: number; children: React.ReactNode }) {
  if (count === 0) return null
  return (
    <div className="px-1 pt-1 pb-2">
      <div className="px-1"><MarkerSeparator label={label} /></div>
      <ul className="list-none p-0 m-0 space-y-px">{children}</ul>
    </div>
  )
}

// ── row ─────────────────────────────────────────────────────────────────────

/** Left status icon per plugin state. */
function StatusIcon({ plugin, setHere, inherited }: { plugin: PluginInfo; setHere: boolean; inherited: boolean }) {
  if (setHere)          return <CheckCircle2 size={12} className="text-green-500/80 shrink-0" />
  if (inherited)        return <CheckCircle2 size={12} className="text-green-500/40 shrink-0" />
  if (plugin.installed) return <Circle       size={12} className="text-sidebar-foreground/30 shrink-0" />
  return <XCircle size={12} className="text-sidebar-foreground/20 shrink-0" />
}

function PluginRow({
  plugin,
  level,
  cliLevel,
  scope,
  installing,
}: {
  plugin: PluginInfo
  level: string
  cliLevel: string
  scope: ScopeArgs
  installing: boolean
}) {
  const setPluginEnabled = useAppStore((s) => s.setPluginEnabled)
  const installPlugin    = useAppStore((s) => s.installPlugin)

  const setHere   = plugin.enabled_here === level
  const inherited = plugin.enabled_effective && !setHere

  return (
    <li className="rounded-md px-2 py-1.5 text-sidebar-foreground/60 hover:bg-sidebar-accent/50 transition-colors">
      <div className="flex items-center gap-1.5">
        <StatusIcon plugin={plugin} setHere={setHere} inherited={inherited} />
        <span className="text-xs font-medium truncate flex-1">{plugin.name}</span>
        {plugin.has_mcp && (
          <span className="shrink-0 flex items-center gap-0.5 text-[8px] font-medium uppercase tracking-wide px-1 py-px rounded bg-sidebar-foreground/10 text-sidebar-foreground/40">
            <Server size={8} />mcp
          </span>
        )}

        {/* Action, by state */}
        {inherited ? (
          <span className="shrink-0 flex items-center gap-0.5 text-[8px] text-sidebar-foreground/40" title={`enabled at ${plugin.enabled_here}`}>
            <ArrowUp size={8} />{plugin.enabled_here}
          </span>
        ) : !plugin.installed ? (
          installing ? (
            <Loader2 size={12} className="shrink-0 animate-spin text-sidebar-foreground/40" />
          ) : (
            <button
              onClick={() => void installPlugin(plugin.name, scope)}
              className="shrink-0 flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded bg-sidebar-foreground/10 text-sidebar-foreground/60 hover:bg-sidebar-foreground/15 hover:text-sidebar-foreground/80 transition-colors"
            >
              <Download size={9} />Install
            </button>
          )
        ) : (
          <Switch on={setHere} onToggle={() => void setPluginEnabled(plugin.name, !setHere, cliLevel, scope)} />
        )}
      </div>
      {plugin.description && (
        <p className="pl-[18px] text-[10px] text-sidebar-foreground/35 leading-snug mt-0.5">{plugin.description}</p>
      )}
    </li>
  )
}

// ── manager ─────────────────────────────────────────────────────────────────

/**
 * Scope-aware plugin manager shared by the Plugins and MCPs panels.
 * `kind` narrows the catalog: `'mcp'` shows only MCP-providing plugins.
 * Sections: Active in this scope (enabled here + inherited) → Catalog
 * (available, then not installed). New sections/actions plug in here.
 */
export function PluginManager({ kind }: { kind: 'all' | 'mcp' }) {
  const plugins           = useAppStore((s) => s.plugins)
  const loading           = useAppStore((s) => s.pluginsLoading)
  const installing        = useAppStore((s) => s.pluginsInstalling)
  const scopePath         = useAppStore((s) => s.scopePath)
  const selectedWorkspace = useAppStore((s) => s.selectedWorkspace)

  const fullPath = selectedWorkspace ? [selectedWorkspace, ...scopePath] : scopePath
  const level    = scopeDisplayLevel(fullPath) ?? 'global'
  const cliLevel = scopeCliLevel(fullPath)
  const scope    = scopeArgsFromPath(fullPath)

  const visible = kind === 'mcp' ? plugins.filter((p) => p.has_mcp) : plugins

  const active  = visible.filter((p) => p.enabled_effective)
  // Catalog: installed (off) first, then not installed.
  const catalog = visible
    .filter((p) => !p.enabled_effective)
    .sort((a, b) => Number(b.installed) - Number(a.installed))

  const row = (p: PluginInfo) => (
    <PluginRow
      key={p.name}
      plugin={p}
      level={level}
      cliLevel={cliLevel}
      scope={scope}
      installing={installing.includes(p.name)}
    />
  )

  return (
    <>
      <ScopeNavigator selectedFolderName={null} />
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading && plugins.length === 0 && (
          <p className="text-[10px] text-sidebar-foreground/25 px-3 pt-1 italic">Loading…</p>
        )}
        {!loading && visible.length === 0 && (
          <p className="text-[10px] text-sidebar-foreground/25 px-3 pt-1 italic">
            {kind === 'mcp' ? 'No MCP servers available' : 'No plugins found'}
          </p>
        )}
        <Section label={`active · ${level}`} count={active.length}>
          {active.map(row)}
        </Section>
        <Section label="catalog" count={catalog.length}>
          {catalog.map(row)}
        </Section>
      </div>
    </>
  )
}
