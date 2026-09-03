import { useEffect } from 'react'
import { listen } from '@tauri-apps/api/event'
import { useAppStore } from '../store'

// Time a session may stay silent after PTY output before it's considered "ready"
// (the engine finished / is awaiting input). The TUI redraws its spinner while
// working, so a short window cleanly separates active output from a quiet prompt.
const QUIET_MS = 1200
// After this much continued silence, the session is downgraded to "idle".
const IDLE_MS = 5 * 60 * 1000

interface Timers { quiet: ReturnType<typeof setTimeout>; idle: ReturnType<typeof setTimeout> }

// Derives session status from PTY activity. Mount once at the app root.
// A single global `pty-data` listener catches output from every open tab (the
// Rust reader emits per PTY regardless of focus); the per-Terminal listener that
// paints xterm is separate. tab_id -> sessionId is resolved via the tabs slice.
export function useSessionActivity() {
  useEffect(() => {
    const timers = new Map<string, Timers>()

    const clear = (sessionId: string) => {
      const t = timers.get(sessionId)
      if (t) { clearTimeout(t.quiet); clearTimeout(t.idle) }
    }

    const bump = (sessionId: string) => {
      const { setSessionStatus } = useAppStore.getState()
      setSessionStatus(sessionId, 'working')
      clear(sessionId)
      timers.set(sessionId, {
        quiet: setTimeout(() => setSessionStatus(sessionId, 'ready'), QUIET_MS),
        idle:  setTimeout(() => setSessionStatus(sessionId, 'idle'), IDLE_MS),
      })
    }

    let unlisten: (() => void) | null = null
    listen<{ tab_id: string; data: string }>('pty-data', (event) => {
      const tab = useAppStore.getState().tabs.find((t) => t.id === event.payload.tab_id)
      if (tab?.sessionId) bump(tab.sessionId)
    }).then((fn) => { unlisten = fn })

    return () => {
      unlisten?.()
      for (const t of timers.values()) { clearTimeout(t.quiet); clearTimeout(t.idle) }
      timers.clear()
    }
  }, [])
}
