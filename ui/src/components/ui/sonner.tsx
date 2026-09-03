import * as React from "react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

import { useAppStore } from "@/store"

// App-wide toast host — mount once near the root (see App.tsx).
// Reads the active theme from the store so toasts follow light/dark. The toast
// surface is driven through Sonner's own CSS variables (--normal-*) so it wins
// over Sonner's bundled stylesheet; we point them at our sidebar tokens.
function Toaster({ ...props }: ToasterProps) {
  const theme = useAppStore((s) => s.theme)

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      position="bottom-right"
      style={
        {
          "--normal-bg": "var(--sidebar)",
          "--normal-text": "var(--sidebar-foreground)",
          "--normal-border": "var(--sidebar-border)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:shadow-lg group-[.toaster]:rounded-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-sidebar-primary group-[.toast]:text-sidebar-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-sidebar-accent group-[.toast]:text-sidebar-accent-foreground",
          error: "group-[.toast]:!text-destructive",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
