import { useEffect, useRef } from 'react'
import { Network } from 'lucide-react'
import { useAppStore } from '../../store'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '../ui/context-menu'
import { RING_CLASS } from './constants'

export function ArchItemsList({
  items,
  sidebarFocused,
  sidebarSelectedIdx,
  onOpen,
}: {
  items: Array<{ type: 'scope-architecture'; workspace: string; tenant: string }>
  sidebarFocused: boolean
  sidebarSelectedIdx: number
  onOpen: (workspace: string, tenant: string) => void
}) {
  const blurSidebar = useAppStore((s) => s.blurSidebar)
  const buttonRefs  = useRef<Map<string, HTMLButtonElement>>(new Map())
  const itemRefs    = useRef<Map<string, HTMLLIElement>>(new Map())

  useEffect(() => {
    const handler = (e: Event) => {
      const { workspace, tenant } = (e as CustomEvent).detail as { workspace: string; tenant: string }
      const key = `${workspace}:${tenant}`
      const btn = buttonRefs.current.get(key)
      if (!btn) return
      const rect = btn.getBoundingClientRect()
      btn.dispatchEvent(new MouseEvent('contextmenu', {
        bubbles: true,
        clientX: rect.left + 8,
        clientY: rect.top + rect.height / 2,
      }))
    }
    window.addEventListener('orbit:open-arch-item-menu', handler)
    return () => window.removeEventListener('orbit:open-arch-item-menu', handler)
  }, [])

  useEffect(() => {
    if (!sidebarFocused || sidebarSelectedIdx < 0) return
    const item = items[sidebarSelectedIdx]
    if (!item) return
    const key = `${item.workspace}:${item.tenant}`
    itemRefs.current.get(key)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [sidebarFocused, sidebarSelectedIdx, items])

  if (items.length === 0) return null

  return (
    <ul className="space-y-0.5">
      {items.map((item, idx) => {
        const key        = `${item.workspace}:${item.tenant}`
        const isSelected = sidebarFocused && idx === sidebarSelectedIdx
        return (
          <li
            key={key}
            ref={(el) => { if (el) itemRefs.current.set(key, el); else itemRefs.current.delete(key) }}
          >
            <ContextMenu onOpenChange={(open) => { if (open) blurSidebar() }}>
              <ContextMenuTrigger asChild>
                <button
                  ref={(el) => { if (el) buttonRefs.current.set(key, el); else buttonRefs.current.delete(key) }}
                  onClick={() => onOpen(item.workspace, item.tenant)}
                  onContextMenu={(e) => e.stopPropagation()}
                  className={`group flex items-center gap-1.5 w-full px-2 py-1.5 rounded-md text-xs text-sidebar-foreground/55 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors ${isSelected ? RING_CLASS : ''}`}
                >
                  <Network size={11} className="shrink-0 text-sidebar-foreground/30 group-hover:text-sidebar-accent-foreground/60" />
                  <span className="truncate font-medium">{item.tenant}</span>
                  <span className="text-[10px] text-sidebar-foreground/30 shrink-0">{item.workspace}</span>
                </button>
              </ContextMenuTrigger>
              <ContextMenuContent className="w-44 text-xs">
                <ContextMenuItem
                  className="text-xs gap-2"
                  onClick={() => onOpen(item.workspace, item.tenant)}
                >
                  <Network size={13} />Open Architecture
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          </li>
        )
      })}
    </ul>
  )
}
