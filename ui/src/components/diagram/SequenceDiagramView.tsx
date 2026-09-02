import { useEffect, useRef, useState, useCallback } from 'react'
import mermaid from 'mermaid'
import { invoke } from '@tauri-apps/api/core'
import { Loader2, Save, RotateCcw } from 'lucide-react'
import type { DiagramEntry } from '../../types'
import { Button } from '../ui/button'

mermaid.initialize({ startOnLoad: false, theme: 'dark', fontFamily: 'inherit' })

const DEFAULT_SEQUENCE = `sequenceDiagram
    participant A as Client
    participant B as Server
    A->>B: Request
    B-->>A: Response`

export function SequenceDiagramView({ entry }: { entry: DiagramEntry }) {
  const containerRef    = useRef<HTMLDivElement>(null)
  const [source, setSource]   = useState(DEFAULT_SEQUENCE)
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(source)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const storageKey = `orbit-diagram-seq-${entry.id}`

  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved) { setSource(saved); setDraft(saved) }
    setLoading(false)
  }, [storageKey])

  useEffect(() => {
    if (loading || !containerRef.current) return
    let cancelled = false
    setError(null)

    mermaid.render(`seq-${entry.id}`, source)
      .then(({ svg }) => {
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg
        }
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message)
      })

    return () => { cancelled = true }
  }, [source, loading, entry.id])

  function save() {
    localStorage.setItem(storageKey, draft)
    setSource(draft)
    setEditing(false)
  }

  function discard() {
    setDraft(source)
    setEditing(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="animate-spin text-muted-foreground" size={20} />
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border/40 shrink-0">
        <span className="text-xs font-medium text-foreground/60 flex-1 truncate">{entry.title}</span>
        {editing ? (
          <>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={discard}>
              <RotateCcw size={12} className="mr-1" />Discard
            </Button>
            <Button size="sm" className="h-7 text-xs" onClick={save}>
              <Save size={12} className="mr-1" />Save
            </Button>
          </>
        ) : (
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(true)}>
            Edit
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 min-h-0">
        {editing && (
          <textarea
            className="w-1/2 h-full p-4 font-mono text-xs bg-card text-foreground border-r border-border/40 resize-none focus:outline-none"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={false}
          />
        )}
        <div className={`flex-1 overflow-auto p-8 flex items-start justify-center ${error ? 'items-center' : ''}`}>
          {error ? (
            <pre className="text-xs text-destructive font-mono whitespace-pre-wrap">{error}</pre>
          ) : (
            <div ref={containerRef} className="max-w-full [&_svg]:max-w-full" />
          )}
        </div>
      </div>
    </div>
  )
}
