import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/** Shared look of a ghost header button. */
const HEADER_ACTION_BASE =
  'h-auto rounded-md text-foreground/40 transition-colors [&_svg]:size-3.5 disabled:opacity-30 hover:bg-sidebar-accent/40 hover:text-foreground/80'

/** Icon-only ghost button classes — apply to `<Button variant="ghost">` to match a HeaderAction. */
export const headerActionIconClass = `${HEADER_ACTION_BASE} p-1`

export interface HeaderActionProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'title'> {
  /** Lucide icon element, e.g. `<Play />`. Sized to 14px by the primitive. */
  icon: React.ReactNode
  /** Tooltip text; also rendered inline when `showLabel` is set. */
  label: string
  /** Render the label next to the icon instead of icon-only. */
  showLabel?: boolean
  /** Toggled / selected state. */
  active?: boolean
  /** Swaps the icon for a spinner and disables the button. */
  loading?: boolean
}

/**
 * The single action-button primitive for every tab header. Ghost by default:
 * icon-only, no border, label revealed on hover via tooltip. Built on the
 * shadcn Button so variants stay consistent across the app.
 */
export const HeaderAction = React.forwardRef<HTMLButtonElement, HeaderActionProps>(
  ({ icon, label, showLabel = false, active = false, loading = false, disabled, className, ...props }, ref) => {
    const button = (
      <Button
        ref={ref}
        variant="ghost"
        disabled={disabled || loading}
        aria-label={label}
        aria-pressed={active}
        className={cn(
          HEADER_ACTION_BASE,
          showLabel ? 'gap-1 px-2 py-1 text-[10px] font-medium' : 'p-1',
          active && 'bg-sidebar-accent/50 text-foreground/80',
          className,
        )}
        {...props}
      >
        {loading ? <Loader2 className="animate-spin" /> : icon}
        {showLabel && <span className="truncate">{label}</span>}
      </Button>
    )

    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="bottom" className="text-[11px]">
          {label}
        </TooltipContent>
      </Tooltip>
    )
  },
)
HeaderAction.displayName = 'HeaderAction'

/** Groups related actions with tight spacing. */
export function HeaderActionGroup({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn('flex items-center gap-1.5 shrink-0', className)}>{children}</div>
}

/**
 * Vertical bar separating action groups. Carries its own `px-2` spacing and
 * hides itself when it lands on an edge — so groups that render null (e.g. make
 * or pipelines when inactive) never leave an orphan divider.
 */
export function HeaderDivider({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center px-2 shrink-0 first:hidden last:hidden', className)}>
      <span className="h-4 w-px bg-sidebar-border/50" />
    </div>
  )
}
