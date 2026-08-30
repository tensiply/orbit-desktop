import { useRef, useEffect, useState } from 'react'
import { useAppStore } from '../store'
import { TerminalPane } from './Terminal'
import { Drawer } from './ui/drawer'
import { sendTerminalCmd } from '../lib/terminalBus'

function abbreviatePath(path: string): string {
  return path.replace(/^\/home\/[^/]+/, '~')
}

export function TerminalDrawer() {
  const drawerOpen   = useAppStore((s) => s.drawerOpen)
  const drawerTabId  = useAppStore((s) => s.drawerTabId)
  const tabDrawers   = useAppStore((s) => s.tabDrawers)
  const closeDrawer  = useAppStore((s) => s.closeDrawer)
  const focusedPanel = useAppStore((s) => s.focusedPanel)

  const everMountedRef = useRef(new Set<string>())
  const [cwdMap, setCwdMap] = useState<Record<string, string>>({})

  const activeCwd = drawerTabId ? (cwdMap[drawerTabId] ?? null) : null

  useEffect(() => {
    if (!drawerOpen || !drawerTabId) return
    const t = setTimeout(() => sendTerminalCmd(drawerTabId, 'fit'), 250)
    return () => clearTimeout(t)
  }, [drawerOpen, drawerTabId])

  const allPtyIds = Object.values(tabDrawers).map((d) => d.ptyId)

  return (
    <Drawer
      open={drawerOpen}
      onClose={closeDrawer}
      title="Terminal"
      width="25%"
      zone="orbit.desktop.drawer.terminal"
      className="bg-card ring-4 ring-sidebar"
      contentDelayMs={210}
      persistContent
    >
      {(contentReady) => {
        if (contentReady) allPtyIds.forEach((id) => everMountedRef.current.add(id))

        return (
          <>
            {/* Path header — mirrors principal.card.session-header style */}
            <div className="flex items-center px-3 h-8 shrink-0 border-b border-sidebar-border/40 bg-card">
              <span className="text-[10px] font-mono text-foreground/45 truncate">
                {activeCwd ? abbreviatePath(activeCwd) : '—'}
              </span>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden relative">
              {allPtyIds.map((ptyId) => {
                if (!everMountedRef.current.has(ptyId)) return null
                const isActive = ptyId === drawerTabId
                return (
                  <div
                    key={ptyId}
                    className={`absolute inset-0 ${isActive ? '' : 'invisible pointer-events-none'}`}
                  >
                    <TerminalPane
                      tabId={ptyId}
                      active={contentReady && drawerOpen && isActive}
                      panelFocused={focusedPanel === 'drawer' && isActive}
                      onCwdChange={(cwd) => setCwdMap((prev) => ({ ...prev, [ptyId]: cwd }))}
                    />
                  </div>
                )
              })}
            </div>
          </>
        )
      }}
    </Drawer>
  )
}
