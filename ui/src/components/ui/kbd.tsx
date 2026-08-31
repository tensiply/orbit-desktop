import * as React from "react"
import { cn } from "@/lib/utils"

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "bg-muted text-muted-foreground inline-flex h-5 items-center gap-1 rounded border px-1 font-mono text-[0.7rem] font-medium shadow-sm select-none",
        className
      )}
      {...props}
    />
  )
}

function KeyBadge({ keys }: { keys: string }) {
  if (!keys) return <span className="text-[10px] text-foreground/25">—</span>
  const parts = keys.split('+').filter(Boolean)
  return (
    <span className="flex items-center gap-1 flex-nowrap">
      {parts.map((k, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className="text-[9px] text-foreground/25 select-none">+</span>}
          <Kbd>{k}</Kbd>
        </span>
      ))}
    </span>
  )
}

export { Kbd, KeyBadge }
