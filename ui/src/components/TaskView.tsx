import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { open } from '@tauri-apps/plugin-shell'
import { TerminalSquare, ExternalLink, Tag, X, Circle } from 'lucide-react'
import type { OrbitTask, TaskStatus, TaskPriority } from '../types'
import { useAppStore } from '../store'

// ── constants ─────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: Array<{ value: TaskStatus; label: string }> = [
  { value: 'todo',        label: 'Todo' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done',        label: 'Done' },
  { value: 'blocked',     label: 'Blocked' },
  { value: 'cancelled',   label: 'Cancelled' },
]

const PRIORITY_OPTIONS: Array<{ value: TaskPriority; label: string }> = [
  { value: 'critical', label: 'Critical' },
  { value: 'high',     label: 'High' },
  { value: 'medium',   label: 'Medium' },
  { value: 'low',      label: 'Low' },
]

const STATUS_COLOR: Record<TaskStatus, string> = {
  todo:        'text-foreground/40',
  in_progress: 'text-blue-400',
  done:        'text-green-500',
  blocked:     'text-red-500',
  cancelled:   'text-foreground/25',
}

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  critical: 'text-red-500',
  high:     'text-orange-400',
  medium:   'text-blue-400',
  low:      'text-foreground/35',
}

function fmtTs(secs: number): string {
  return new Date(secs * 1000).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

// ── sub-components ────────────────────────────────────────────────────────────

function TagsEditor({
  tags,
  onChange,
}: {
  tags:     string[]
  onChange: (tags: string[]) => void
}) {
  const [draft, setDraft] = useState('')

  const addTag = () => {
    const t = draft.trim().toLowerCase()
    if (t && !tags.includes(t)) onChange([...tags, t])
    setDraft('')
  }

  const removeTag = (tag: string) => onChange(tags.filter((t) => t !== tag))

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() }
    if (e.key === 'Backspace' && !draft && tags.length > 0) removeTag(tags[tags.length - 1])
  }

  return (
    <div className="flex items-center flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-foreground/8 text-foreground/60"
        >
          {tag}
          <button
            onClick={() => removeTag(tag)}
            className="text-foreground/30 hover:text-foreground/60 transition-colors"
          >
            <X size={9} />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={addTag}
        placeholder="Add tag…"
        className="text-[10px] bg-transparent text-foreground/50 placeholder:text-foreground/25 outline-none min-w-[60px]"
      />
    </div>
  )
}

// ── TaskView ──────────────────────────────────────────────────────────────────

export function TaskView({
  task,
  style,
}: {
  task:   OrbitTask
  style?: React.CSSProperties
}) {
  const updateTask         = useAppStore((s) => s.updateTask)
  const launchScopeSession = useAppStore((s) => s.launchScopeSession)

  const [title,       setTitle]       = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')
  const [tags,        setTags]        = useState(task.tags)
  const [launching,   setLaunching]   = useState(false)

  // Sync if task prop changes (e.g., updated from sidebar)
  useEffect(() => {
    setTitle(task.title)
    setDescription(task.description ?? '')
    setTags(task.tags)
  }, [task.id])

  const saveTitle = () => {
    const t = title.trim()
    if (t && t !== task.title) void updateTask(task.workspace, task.id, { title: t })
    else setTitle(task.title)
  }

  const saveDescription = () => {
    if (description !== (task.description ?? '')) {
      void updateTask(task.workspace, task.id, { description: description || null })
    }
  }

  const saveTags = (newTags: string[]) => {
    setTags(newTags)
    void updateTask(task.workspace, task.id, { tags: newTags })
  }

  const changeStatus = (status: TaskStatus) => {
    void updateTask(task.workspace, task.id, { status })
  }

  const changePriority = (priority: TaskPriority) => {
    void updateTask(task.workspace, task.id, { priority })
  }

  const startSession = async () => {
    setLaunching(true)
    try {
      const scopePath = [
        task.workspace,
        task.tenant,
        task.project,
        task.repository,
      ].filter((s): s is string => !!s)
      await launchScopeSession(scopePath)
    } finally {
      setLaunching(false)
    }
  }

  const externalUrl = task.source.type === 'plugin' ? task.source.url : undefined
  const sourceLabel = task.source.type === 'plugin' ? task.source.name : null

  const scopeCrumb = [task.tenant, task.project, task.repository].filter(Boolean).join(' › ')

  const selectClass = `text-[10px] font-medium bg-transparent border border-border/40 rounded px-1.5 py-0.5 outline-none cursor-pointer transition-colors hover:border-border/70 focus:border-ring`

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={style}>
      <div className="max-w-2xl w-full mx-auto px-8 py-8 flex flex-col gap-6">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* ID chip */}
            <span className="font-mono text-[10px] text-foreground/35 shrink-0">{task.id}</span>

            {/* Source badge */}
            {sourceLabel && (
              <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-foreground/8 text-foreground/45 shrink-0">
                {sourceLabel}
                {task.task_type && ` · ${task.task_type}`}
              </span>
            )}

            <div className="ml-auto flex items-center gap-2">
              {/* Priority select */}
              <select
                value={task.priority}
                onChange={(e) => changePriority(e.target.value as TaskPriority)}
                className={`${selectClass} ${PRIORITY_COLOR[task.priority]}`}
              >
                {PRIORITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              {/* Status select */}
              <select
                value={task.status}
                onChange={(e) => changeStatus(e.target.value as TaskStatus)}
                className={`${selectClass} ${STATUS_COLOR[task.status]}`}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Title */}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
            className="text-xl font-semibold text-foreground bg-transparent outline-none border-b border-transparent hover:border-border/30 focus:border-border/60 transition-colors pb-0.5 w-full"
            placeholder="Task title"
          />
        </div>

        {/* ── Description ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-medium text-foreground/35 uppercase tracking-wider">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={saveDescription}
            placeholder="Add a description…"
            rows={4}
            className="text-sm text-foreground/80 bg-transparent outline-none resize-none border border-transparent hover:border-border/30 focus:border-border/50 rounded-md px-0 py-0 hover:px-2 hover:py-2 focus:px-2 focus:py-2 transition-all placeholder:text-foreground/20"
          />
        </div>

        {/* ── Integration Hub ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-medium text-foreground/35 uppercase tracking-wider">
            Integration
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void startSession()}
              disabled={launching}
              className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-md bg-foreground/8 hover:bg-foreground/12 text-foreground/70 hover:text-foreground transition-colors disabled:opacity-50"
            >
              <TerminalSquare size={13} />
              {launching ? 'Starting…' : 'Start Session'}
            </button>

            <button
              disabled
              title="Attach Plan — coming soon"
              className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-md bg-foreground/5 text-foreground/30 cursor-not-allowed"
            >
              <Circle size={13} />
              Attach Plan
            </button>

            {externalUrl && (
              <button
                onClick={() => void open(externalUrl)}
                className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-md bg-foreground/8 hover:bg-foreground/12 text-foreground/70 hover:text-foreground transition-colors"
              >
                <ExternalLink size={13} />
                Open in {sourceLabel ?? 'source'}
              </button>
            )}
          </div>
        </div>

        {/* ── Tags ────────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-medium text-foreground/35 uppercase tracking-wider flex items-center gap-1">
            <Tag size={10} />Tags
          </label>
          <TagsEditor tags={tags} onChange={saveTags} />
        </div>

        {/* ── Metadata ────────────────────────────────────────────────────── */}
        <div className="border-t border-border/20 pt-4 flex flex-col gap-1.5">
          {scopeCrumb && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-foreground/30 w-20 shrink-0">Scope</span>
              <span className="text-[10px] text-foreground/50">{scopeCrumb}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-foreground/30 w-20 shrink-0">Created</span>
            <span className="text-[10px] text-foreground/40">{fmtTs(task.created_at)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-foreground/30 w-20 shrink-0">Updated</span>
            <span className="text-[10px] text-foreground/40">{fmtTs(task.updated_at)}</span>
          </div>
        </div>

      </div>
    </div>
  )
}
