import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { listen } from '@tauri-apps/api/event'
import { Loader2, Square, Check, CircleX } from 'lucide-react'
import { useAppStore } from '../store'
import { Drawer } from './ui/drawer'

interface ExecOutput { exec_id: string; chunk: string }
interface ExecDone   { exec_id: string; code: number | null }

function abbreviatePath(path: string): string {
  return path.replace(/^\/home\/[^/]+/, '~')
}

function copyToClipboard(text: string) {
  void navigator.clipboard?.writeText(text)
}

export function ExecutionDrawer() {
  const open         = useAppStore((s) => s.executionDrawerOpen)
  const command      = useAppStore((s) => s.executionCommand)
  const artifactPath = useAppStore((s) => s.executionArtifactPath)
  const execId       = useAppStore((s) => s.executionExecId)
  const close        = useAppStore((s) => s.closeExecutionDrawer)
  const kill         = useAppStore((s) => s.killExecution)

  // Output is keyed by exec id: a chunk for a new id starts a fresh buffer, so a
  // re-run clears the view without a reset effect that could drop early chunks.
  const [buf, setBuf]           = useState<{ execId: string | null; text: string }>({ execId: null, text: '' })
  const [running, setRunning]   = useState(false)
  const [exitCode, setExitCode] = useState<number | null>(null)

  const scrollRef   = useRef<HTMLPreElement>(null)
  const atBottomRef = useRef(true)

  // Persistent listeners — mounted for the app's lifetime, so they are always
  // ready before a run starts. They match events against the store's current
  // exec id (updated synchronously before exec_run), so no early output is lost.
  useEffect(() => {
    const unlisteners: Array<() => void> = []
    void listen<ExecOutput>('exec-output', (e) => {
      if (e.payload.exec_id !== useAppStore.getState().executionExecId) return
      setBuf((prev) =>
        prev.execId === e.payload.exec_id
          ? { execId: prev.execId, text: prev.text + e.payload.chunk }
          : { execId: e.payload.exec_id, text: e.payload.chunk },
      )
    }).then((fn) => unlisteners.push(fn))
    void listen<ExecDone>('exec-done', (e) => {
      if (e.payload.exec_id !== useAppStore.getState().executionExecId) return
      setRunning(false)
      setExitCode(e.payload.code)
    }).then((fn) => unlisteners.push(fn))
    return () => unlisteners.forEach((fn) => fn())
  }, [])

  // A new run: mark running and follow the fresh stream.
  useEffect(() => {
    if (execId) {
      setExitCode(null)
      setRunning(true)
      atBottomRef.current = true
    }
  }, [execId])

  const output = buf.execId === execId ? buf.text : ''

  // Follow the tail unless the user has scrolled up to read earlier output.
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el && atBottomRef.current) el.scrollTop = el.scrollHeight
  }, [output])

  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24
  }

  return (
    <Drawer
      open={open}
      onClose={close}
      title="Execution"
      width="30%"
      zone="orbit.desktop.drawer.execution"
      className="bg-card ring-4 ring-sidebar"
    >
      {/* Command + status header — mirrors the terminal drawer style */}
      <div className="flex items-center gap-2 px-3 h-8 shrink-0 border-b border-sidebar-border/40 bg-card">
        <div className="flex flex-col justify-center min-w-0 flex-1">
          <span className="text-[11px] font-mono text-foreground/70 truncate">
            {command ? `$ ${command}` : '—'}
          </span>
          {artifactPath && (
            <button
              type="button"
              onClick={() => copyToClipboard(artifactPath)}
              title={`Copy artifact path\n${artifactPath}`}
              className="text-[9px] font-mono text-foreground/35 hover:text-foreground/60 truncate leading-none text-left transition-colors"
            >
              ↳ {abbreviatePath(artifactPath)}
            </button>
          )}
        </div>

        {running ? (
          <button
            onClick={kill}
            title="Stop execution"
            aria-label="Stop execution"
            className="flex items-center gap-1 shrink-0 text-[10px] text-foreground/50 hover:text-red-400 transition-colors"
          >
            <Loader2 size={11} className="animate-spin" />
            <Square size={11} />
          </button>
        ) : exitCode !== null ? (
          exitCode === 0 ? (
            <Check size={13} className="shrink-0 text-emerald-500" aria-label="Succeeded" />
          ) : (
            <span className="flex items-center gap-1 shrink-0 text-[10px] text-red-400" title={`Exit code ${exitCode}`}>
              <CircleX size={12} /> {exitCode}
            </span>
          )
        ) : null}
      </div>

      <pre
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 min-h-0 overflow-auto m-0 p-3 text-[12px] leading-[1.45] font-mono text-foreground/85 whitespace-pre bg-card"
      >
        {output || (
          <span className="text-foreground/30">Waiting for output…</span>
        )}
      </pre>
    </Drawer>
  )
}
