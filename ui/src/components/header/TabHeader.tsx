import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { ScopeBreadcrumb } from './ScopeBreadcrumb'

/**
 * The unified tab header: a fixed-height bar with a leading type/engine icon,
 * a scope breadcrumb on the left, and tab-specific actions on the right. Every
 * tab kind (terminal, file, diagram, task, …) mounts this so the surface stays
 * visually identical regardless of content.
 */
export function TabHeader({
  icon,
  parts = [],
  globalMode = false,
  breadcrumb,
  actions,
  className,
}: {
  icon?: ReactNode
  /** Scope segments for the default breadcrumb. Ignored when `breadcrumb` is set. */
  parts?: string[]
  globalMode?: boolean
  /** Custom left content; overrides the default `ScopeBreadcrumb`. */
  breadcrumb?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div
      data-orbit-zone="orbit.desktop.principal.card.tab-header"
      className={cn(
        'flex items-center gap-3 px-4 min-h-8 py-1 shrink-0 border-b border-sidebar-border/40 bg-card',
        className,
      )}
    >
      {icon && <span className="text-foreground/25 shrink-0">{icon}</span>}
      {breadcrumb ?? <ScopeBreadcrumb parts={parts} globalMode={globalMode} />}
      {/* Groups are separated with an explicit <HeaderDivider/>, which supplies
          its own spacing and hides itself on edges. Wrap related buttons in a
          <HeaderActionGroup> to keep them together. */}
      {actions && <div className="flex items-center shrink-0">{actions}</div>}
    </div>
  )
}
