import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * MarkerSeparator — a centered section marker (label) flanked by horizontal
 * rules on both sides. Used for in-list section headers such as
 * Current / History. Based on the shadcn separator pattern.
 */
const MarkerSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { label: React.ReactNode }
>(({ className, label, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center gap-2", className)} {...props}>
    <span className="h-px flex-1 bg-sidebar-border/50" />
    <span className="shrink-0 text-[9px] font-medium tracking-wider text-sidebar-foreground/20">
      {label}
    </span>
    <span className="h-px flex-1 bg-sidebar-border/50" />
  </div>
))
MarkerSeparator.displayName = "MarkerSeparator"

export { MarkerSeparator }
