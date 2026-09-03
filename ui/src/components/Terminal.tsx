import { useEffect, useRef } from 'react'
import { listen } from '@tauri-apps/api/event'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { useAppStore } from '../store'
import { tauriService } from '../services/tauri'
import type { TerminalCmd } from '../lib/terminalBus'
import { markPtyInput, markPtyResize } from '../lib/ptyActivity'
import { TERMINAL_THEME_DARK, TERMINAL_THEME_LIGHT, cssVarToHex } from '../theme'

interface Props {
  tabId:         string
  active:        boolean
  panelFocused?: boolean
  onCwdChange?:  (cwd: string) => void
}

export function TerminalPane({ tabId, active, panelFocused, onCwdChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef      = useRef<Terminal | null>(null)
  const fitRef       = useRef<FitAddon | null>(null)
  const theme        = useAppStore((s) => s.theme)
  const scrollback   = useAppStore((s) => s.getSettingValue('terminal.scrollback') as number ?? 5000)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const term = new Terminal({
      cursorBlink: true,
      fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", "Courier New", monospace',
      fontSize: 13,
      lineHeight: 1.25,
      theme: {
        ...(theme === 'light' ? TERMINAL_THEME_LIGHT : TERMINAL_THEME_DARK),
        background: cssVarToHex('--card'),
      },
      allowTransparency: false,
      scrollback,
    })

    const fit = new FitAddon()
    term.loadAddon(fit)
    term.loadAddon(new WebLinksAddon())
    term.open(el)

    termRef.current = term
    fitRef.current  = fit

    // OSC 7: shell reports current directory as file://hostname/path
    term.parser.registerOscHandler(7, (data) => {
      const match = data.match(/^file:\/\/[^/]*(\/.*)?$/)
      if (match) onCwdChange?.(match[1] ?? '/')
      return true
    })

    // xterm's Viewport computes scrollBarWidth as (viewport.offsetWidth - scrollArea.offsetWidth) || 15.
    // When CSS hides the scrollbar (display:none), the difference becomes 0 and the || 15 fallback fires,
    // making FitAddon subtract 15px from the available width. Patch it to 0 since we have no visible scrollbar.
    const core = (term as any)._core
    if (core?.viewport) {
      Object.defineProperty(core.viewport, 'scrollBarWidth', { get: () => 0, configurable: true })
    }

    const safeFit = () => {
      try { fit.fit() } catch { /* renderer not yet ready */ }
    }

    let fitTimer: ReturnType<typeof setTimeout> | null = null
    const ro = new ResizeObserver(() => {
      if (el.offsetWidth > 0 && el.offsetHeight > 0) {
        if (fitTimer !== null) clearTimeout(fitTimer)
        fitTimer = setTimeout(() => { safeFit(); fitTimer = null }, 30)
      }
    })
    ro.observe(el)

    term.onData((data) => {
      markPtyInput(tabId)
      tauriService.ptyWrite(tabId, data).catch(console.error)
    })

    term.onResize(({ cols, rows }) => {
      // The engine repaints on SIGWINCH; mark it so that burst isn't read as work.
      markPtyResize(tabId)
      tauriService.ptyResize(tabId, cols, rows).catch(console.error)
    })

    let unlisten: (() => void) | null = null
    listen<{ tab_id: string; data: string }>('pty-data', (event) => {
      if (event.payload.tab_id === tabId) {
        term.write(event.payload.data)
      }
    }).then((fn) => {
      unlisten = fn
      // Double RAF: first frame settles flex layout, second gives the WebView
      // time to report final dimensions. fit() and SIGWINCH run together so
      // the PTY always receives the correct post-fit size.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          safeFit()
          term.focus()
          const { cols, rows } = term
          markPtyResize(tabId)
          tauriService.ptyResize(tabId, cols + 1, rows)
            .then(() => tauriService.ptyResize(tabId, cols, rows))
            .catch(console.error)
        })
      })
    })

    return () => {
      ro.disconnect()
      if (fitTimer !== null) clearTimeout(fitTimer)
      unlisten?.()
      term.dispose()
      termRef.current = null
      fitRef.current  = null
    }
  }, [tabId])

  // Apply theme to live terminal instance when it changes
  useEffect(() => {
    if (termRef.current) {
      const baseTheme = theme === 'light' ? TERMINAL_THEME_LIGHT : TERMINAL_THEME_DARK
      termRef.current.options.theme = { ...baseTheme, background: cssVarToHex('--card') }
    }
  }, [theme])

  useEffect(() => {
    if (termRef.current) termRef.current.options.scrollback = scrollback
  }, [scrollback])

  useEffect(() => {
    if (active) {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        try { fitRef.current?.fit() } catch { /* renderer not yet ready */ }
        termRef.current?.focus()
      }))
    }
  }, [active])

  useEffect(() => {
    if (panelFocused) {
      requestAnimationFrame(() => termRef.current?.focus())
    }
  }, [panelFocused])

  // Listen for terminal commands dispatched by the global shortcut handler.
  useEffect(() => {
    if (!active) return
    const handler = (e: Event) => {
      const { tabId: t, cmd } = (e as CustomEvent<{ tabId: string; cmd: TerminalCmd }>).detail
      if (t !== tabId || !termRef.current) return
      if (cmd === 'clear')             termRef.current.clear()
      else if (cmd === 'scroll_up')   termRef.current.scrollLines(-termRef.current.rows)
      else if (cmd === 'scroll_down') termRef.current.scrollLines(termRef.current.rows)
      else if (cmd === 'focus')       termRef.current.focus()
      else if (cmd === 'fit')         { try { fitRef.current?.fit() } catch { /* renderer not ready */ } }
    }
    document.addEventListener('orbit:terminal-cmd', handler)
    return () => document.removeEventListener('orbit:terminal-cmd', handler)
  }, [active, tabId])

  const handleClick = () => termRef.current?.focus()

  return (
    <div
      className="w-full h-full p-4 rounded-2xl overflow-hidden"
      onClick={handleClick}
    >
      <div ref={containerRef} className="w-full h-full bg-card" />
    </div>
  )
}
