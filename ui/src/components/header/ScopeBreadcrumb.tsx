import { cn } from '@/lib/utils'

/**
 * Scope breadcrumb shared by every tab header. Renders `›`-separated parts with
 * the trailing (current) segment emphasised, or a "Global" pill when the scope
 * is global.
 */
export function ScopeBreadcrumb({
  parts,
  globalMode = false,
  className,
}: {
  parts: string[]
  globalMode?: boolean
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-0.5 flex-1 min-w-0 overflow-hidden', className)}>
      {globalMode ? (
        <span className="text-[10px] font-medium text-foreground/40">Global</span>
      ) : parts.length > 0 ? (
        parts.map((part, i) => (
          <span key={i} className="flex items-center gap-0.5 shrink-0">
            {i > 0 && <span className="text-[10px] text-foreground/18 mx-0.5">›</span>}
            <span
              className={cn(
                'text-[10px] font-medium',
                i === parts.length - 1 ? 'text-foreground/55' : 'text-foreground/28',
              )}
            >
              {part}
            </span>
          </span>
        ))
      ) : (
        <span className="text-[10px] text-foreground/25">—</span>
      )}
    </div>
  )
}
