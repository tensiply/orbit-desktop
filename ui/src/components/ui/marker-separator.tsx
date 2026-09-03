import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * MarkerSeparator — a centered section marker (label). Used for in-list section
 * headers such as Current / History.
 */
const MarkerSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { label: React.ReactNode }
>(({ className, label, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center justify-center pt-2", className)} {...props}>
    <span className="text-[9px] font-medium tracking-wider text-sidebar-foreground/20">
      {label}
    </span>
  </div>
))
MarkerSeparator.displayName = "MarkerSeparator"

export { MarkerSeparator }
