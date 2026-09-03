import { useEffect } from 'react'
import { listen } from '@tauri-apps/api/event'
import { useAppStore } from '../store'
import { lastPtyInputAt, lastPtyResizeAt } from '../lib/ptyActivity'

// PTY output that lands within this window after a keystroke is treated as the
// echo of what the user typed, not the engine working. This keeps the status
// green while you type and only turns it yellow on engine-driven output (e.g. the
// spinner redrawing while it processes).
const ECHO_WINDOW_MS = 350
// PTY output that lands within this window after the frontend resized the terminal
// is the engine repainting on SIGWINCH, not real work. Entering a tab, toggling the
// sidebar, or resizing the window all trigger a fit/resize + full repaint; without
// this suppression that burst flips the session to working and then done ("finished"
// notification) even though nothing was running. Wider than ECHO_WINDOW_MS because a
// full-screen repaint streams in over several frames.
const RESIZE_WINDOW_MS = 600
// Silence after engine output before the session is considered no longer working.
const QUIET_MS = 1200

// Derives session status from PTY activity. Mount once at the app root.
//
//  engine output → working. After QUIET_MS of silence it settles to:
//    - idle  if the tab is currently seen (active tab + window focused)
//    - done  otherwise (finished while you were elsewhere → green pulse)
//  Focusing/activating a `done` session's tab clears it to idle.
export function useSessionActivity() {
  const activeTabId    = useAppStore((s) => s.activeTabId)

  // ── PTY output → working / done / idle ───────────────────────────────────────
  useEffect(() => {
    const timers = new Map<string, ReturnType<typeof setTimeout>>()

    const isSeen = (sessionId: string): boolean => {
      if (!document.hasFocus()) return false
      const { activeTabId, tabs } = useAppStore.getState()
      const activeTab = tabs.find((t) => t.id === activeTabId)
      return activeTab?.sessionId === sessionId
    }

    const bump = (sessionId: string) => {
      const { setSessionStatus } = useAppStore.getState()
      setSessionStatus(sessionId, 'working')
      const existing = timers.get(sessionId)
      if (existing) clearTimeout(existing)
      timers.set(sessionId, setTimeout(() => {
        useAppStore.getState().setSessionStatus(sessionId, isSeen(sessionId) ? 'idle' : 'done')
      }, QUIET_MS))
    }

    let unlisten: (() => void) | null = null
    listen<{ tab_id: string; data: string }>('pty-data', (event) => {
      const { tab_id } = event.payload
      const now = Date.now()
      // Ignore keystroke echoes — only engine-driven output flips to working.
      if (now - lastPtyInputAt(tab_id) < ECHO_WINDOW_MS) return
      // Ignore the repaint burst a resize/SIGWINCH triggers — it's not real work.
      if (now - lastPtyResizeAt(tab_id) < RESIZE_WINDOW_MS) return
      const tab = useAppStore.getState().tabs.find((t) => t.id === tab_id)
      if (tab?.sessionId) bump(tab.sessionId)
    }).then((fn) => { unlisten = fn })

    return () => {
      unlisten?.()
      for (const t of timers.values()) clearTimeout(t)
      timers.clear()
    }
  }, [])

  // ── Clear `done` → idle once the user actually sees the session ──────────────
  useEffect(() => {
    const promoteActive = () => {
      if (!document.hasFocus()) return
      const { activeTabId, tabs, sessionStatus, setSessionStatus } = useAppStore.getState()
      const sid = tabs.find((t) => t.id === activeTabId)?.sessionId
      if (sid && sessionStatus[sid] === 'done') setSessionStatus(sid, 'idle')
    }
    promoteActive()
    window.addEventListener('focus', promoteActive)
    return () => window.removeEventListener('focus', promoteActive)
  }, [activeTabId])
}
