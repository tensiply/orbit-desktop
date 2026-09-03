import { useEffect, createElement } from "react"
import { CheckCircle2, WifiOff } from "lucide-react"
import { listen } from "@tauri-apps/api/event"

import { eventBus } from "@/lib/eventBus"
import { notify, type NotifyOptions } from "@/lib/notify"
import {
  ensureNotificationPermission,
  notifyWhenUnfocused,
  sendNativeNotification,
} from "@/lib/nativeNotify"
import { useAppStore } from "@/store"
import type { SessionStatus } from "@/types"

// Bridges notification sources to on-screen toasts. Mounted once at the app
// root (see App.tsx). Kept out of the store slice on purpose: the slice only
// emits facts (`session:status-changed`); how those become notifications is a
// UI concern that lives here. Two sources feed it:
//   1. the domain event bus (session lifecycle), and
//   2. the debug MCP server, which emits `debug:notify` so notifications can be
//      fired on demand from tooling (testing, design iteration).

/** Resolve a friendly session label, falling back to a short id. */
function sessionLabel(sessionId: string): string {
  const session = useAppStore.getState().sessions.find((s) => s.id === sessionId)
  const label =
    session?.repository ||
    session?.project ||
    session?.work_dir?.split("/").filter(Boolean).pop()
  return label?.trim() || `Session ${sessionId.slice(0, 6)}`
}

/**
 * Which status transitions surface a notification, and how. Each notable event
 * shows an in-app toast and, when the window is backgrounded, an OS notification
 * (same message) so the user hears about it without the app in front.
 */
function notifyFor(from: SessionStatus | undefined, to: SessionStatus, label: string) {
  const record = useAppStore.getState().pushNotification

  // Agent went idle after actively working — the "it's done, come back" ping.
  if (to === "done" && from === "working") {
    const title = `${label} finished`
    const body = "The agent is done working."
    notify.success(title, {
      description: body,
      icon: createElement(CheckCircle2, { size: 16 }),
    })
    record({ title, description: body, level: "success" })
    void notifyWhenUnfocused({ title, body })
    return
  }
  // A live session dropped off (process ended / disconnected).
  if (to === "offline" && from && from !== "offline") {
    const title = `${label} went offline`
    notify.warning(title, { icon: createElement(WifiOff, { size: 16 }) })
    record({ title, level: "warning" })
    void notifyWhenUnfocused({ title })
  }
}

// Payload shape emitted by the debug MCP server's `notify` tool.
interface DebugNotifyPayload {
  dismiss?: boolean
  title: string
  description?: string | null
  level?: "success" | "error" | "info" | "warning" | "message"
  native?: boolean
  duration?: number | null
}

/** Render a toast (and optional native notification) from an MCP `debug:notify`. */
function fireDebugNotify(p: DebugNotifyPayload) {
  if (p.dismiss) {
    notify.dismiss()
    return
  }

  const opts: NotifyOptions = {}
  if (p.description) opts.description = p.description
  // duration === 0 → keep on screen until dismissed (design work); >0 → ms.
  if (p.duration === 0) opts.duration = Infinity
  else if (typeof p.duration === "number") opts.duration = p.duration

  const level = p.level ?? "message"
  ;(notify[level] ?? notify.message)(p.title, opts)
  useAppStore.getState().pushNotification({
    title: p.title,
    description: p.description ?? undefined,
    level,
  })

  if (p.native) {
    void sendNativeNotification({ title: p.title, body: p.description ?? undefined })
  }
}

export function useSessionNotifications() {
  useEffect(() => {
    // Resolve OS notification permission up front so the first background event
    // can fire without a prompt racing the notification.
    void ensureNotificationPermission()

    const off = eventBus.on("session:status-changed", ({ sessionId, from, to }) => {
      // Skip first-seen transitions (undefined → x) to avoid a burst on startup.
      if (from === undefined) return
      notifyFor(from, to, sessionLabel(sessionId))
    })

    // MCP-triggered notifications (debug server → webview).
    const unlisten = listen<DebugNotifyPayload>("debug:notify", ({ payload }) => {
      fireDebugNotify(payload)
    })

    return () => {
      off()
      void unlisten.then((fn) => fn())
    }
  }, [])
}
