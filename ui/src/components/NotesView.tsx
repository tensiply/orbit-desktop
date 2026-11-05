import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, NotebookPen, Plus, Trash2 } from 'lucide-react'
import type { ScopeArgs, NoteInfo, NoteContent } from '../types'
import { tauriService } from '../services/tauri'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from './ui/empty'

interface Props {
  scope: ScopeArgs
}

// Matches the Drawer header: same height, padding, border, and icon-button style.
const HEADER = 'flex items-center h-8 px-3 bg-card border-b border-sidebar-border/40 shrink-0 gap-2'
const HEADER_BTN = 'p-1 rounded-md text-foreground/20 hover:text-foreground/60 hover:bg-foreground/5 transition-colors shrink-0 disabled:opacity-40 disabled:pointer-events-none'

function scopeLabel(scope: ScopeArgs): string {
  return scope.repository || scope.project || scope.tenant || scope.workspace || 'global'
}

function formatDate(secs: number): string {
  if (!secs) return ''
  try {
    return new Date(secs * 1000).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return ''
  }
}

const BLANK: NoteContent = { id: '', title: '', body: '', path: '', created_at: 0, updated_at: 0 }

export function NotesView({ scope }: Props) {
  const [notes, setNotes]     = useState<NoteInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [active, setActive]   = useState<NoteContent | null>(null)

  const hasWorkspace = !!scope.workspace

  const refresh = useCallback(async () => {
    if (!hasWorkspace) {
      setNotes([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      setNotes(await tauriService.notesList(scope))
    } catch (e) {
      console.error('[orbit] notes_list failed', e)
    } finally {
      setLoading(false)
    }
    // scope fields are the identity here; refetch when any of them changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope.workspace, scope.tenant, scope.project, scope.repository])

  useEffect(() => { void refresh() }, [refresh])

  if (active !== null) {
    return (
      <NoteEditor
        key={active.id || 'new'}
        scope={scope}
        note={active}
        onBack={() => { setActive(null); void refresh() }}
      />
    )
  }

  const openNote = async (info: NoteInfo) => {
    try {
      setActive(await tauriService.noteRead(info.path))
    } catch (e) {
      console.error('[orbit] note_read failed', e)
    }
  }

  return (
    <div className="flex flex-col h-full bg-card">
      <header className={HEADER}>
        <span className="text-xs font-medium text-foreground/55 flex-1 truncate">
          {scopeLabel(scope)}
        </span>
        <button
          onClick={() => setActive({ ...BLANK })}
          disabled={!hasWorkspace}
          title="New note"
          aria-label="New note"
          className={HEADER_BTN}
        >
          <Plus size={14} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {!hasWorkspace ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><NotebookPen /></EmptyMedia>
              <EmptyTitle>No scope selected</EmptyTitle>
              <EmptyDescription>
                Open a session or select a workspace to take notes.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : loading ? (
          <p className="text-xs text-foreground/40">Loading…</p>
        ) : (
          <div className="flex flex-col gap-2">
            {notes.map((note) => (
              <button
                key={note.id}
                onClick={() => void openNote(note)}
                className="flex flex-col gap-1 text-left rounded-xl border border-border/60 bg-background/40 p-3 hover:bg-accent/40 transition-colors"
              >
                <span className="text-sm font-medium truncate">
                  {note.title || 'Untitled'}
                </span>
                <span className="text-xs text-foreground/50 line-clamp-2">
                  {note.preview || 'No content'}
                </span>
                <span className="text-[10px] text-foreground/30 mt-1">
                  {formatDate(note.updated_at)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── editor ─────────────────────────────────────────────────────────────────────

interface EditorProps {
  scope: ScopeArgs
  note:  NoteContent
  onBack: () => void
}

function NoteEditor({ scope, note, onBack }: EditorProps) {
  const [title, setTitle] = useState(note.title)
  const [body, setBody]   = useState(note.body)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>(note.id ? 'saved' : 'idle')
  const [updatedAt, setUpdatedAt] = useState(note.updated_at)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const idRef        = useRef<string | null>(note.id || null)
  const pathRef      = useRef<string>(note.path)
  const persistedRef = useRef({ title: note.title, body: note.body })

  const save = useCallback(async () => {
    if (!scope.workspace) return
    if (title === persistedRef.current.title && body === persistedRef.current.body) return
    if (!title.trim() && !body.trim()) return
    setStatus('saving')
    try {
      const info = await tauriService.noteSave(scope, idRef.current, title, body)
      idRef.current = info.id
      pathRef.current = info.path
      persistedRef.current = { title, body }
      setUpdatedAt(info.updated_at)
      setStatus('saved')
    } catch (e) {
      console.error('[orbit] note_save failed', e)
      setStatus('idle')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, body, scope.workspace, scope.tenant, scope.project, scope.repository])

  // Debounced auto-save on every edit.
  useEffect(() => {
    const t = setTimeout(() => { void save() }, 700)
    return () => clearTimeout(t)
  }, [title, body, save])

  // Flush any pending edit when the editor unmounts (e.g. the drawer is closed
  // mid-typing before the debounce fires).
  const saveRef = useRef(save)
  saveRef.current = save
  useEffect(() => () => { void saveRef.current() }, [])

  const handleBack = async () => {
    await save()
    onBack()
  }

  const handleDelete = async () => {
    if (idRef.current && pathRef.current) {
      try {
        await tauriService.noteDelete(pathRef.current)
      } catch (e) {
        console.error('[orbit] note_delete failed', e)
      }
    }
    onBack()
  }

  return (
    <div className="flex flex-col h-full bg-card">
      <header className={HEADER}>
        <button
          onClick={() => void handleBack()}
          title="Back"
          aria-label="Back"
          className={HEADER_BTN}
        >
          <ChevronLeft size={14} />
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5 text-[10px]">
          <span className="text-foreground/40">
            {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : 'Not saved'}
          </span>
          {updatedAt > 0 && (
            <>
              <span className="text-foreground/20">·</span>
              <span className="text-foreground/30">{formatDate(updatedAt)}</span>
            </>
          )}
        </div>
        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => void handleDelete()}
              className="px-2 h-6 rounded-md text-[11px] text-destructive hover:bg-destructive/10 transition-colors"
            >
              Delete
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-2 h-6 rounded-md text-[11px] text-foreground/40 hover:bg-foreground/5 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            title="Delete note"
            aria-label="Delete note"
            className={HEADER_BTN}
          >
            <Trash2 size={13} />
          </button>
        )}
      </header>

      <div className="flex-1 flex flex-col min-h-0 bg-card">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="bg-transparent px-3 py-2 text-base font-medium outline-none placeholder:text-foreground/25"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your note…"
          className="flex-1 resize-none bg-transparent px-3 py-2 font-mono text-xs leading-relaxed outline-none placeholder:text-foreground/25"
        />
      </div>
    </div>
  )
}
