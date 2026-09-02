import { useEffect, useRef, useState, KeyboardEvent } from 'react'
import { Plus, Trash2, ExternalLink, Check } from 'lucide-react'
import type { OrbitTask, TaskStatus } from '../../types'
import { useAppStore } from '../../store'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '../ui/context-menu'
import { MarkerSeparator } from '../ui/marker-separator'
import { RING_CLASS } from './constants'

// ── helpers ───────────────────────────────────────────────────────────────────

function relativeTime(unixSecs: number): string {
  const diffSecs = Math.floor(Date.now() / 1000) - unixSecs
  if (diffSecs < 60)    return 'just now'
  if (diffSecs < 3600)  return `${Math.floor(diffSecs / 60)}m ago`
  if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`
  return `${Math.floor(diffSecs / 86400)}d ago`
}

const PRIORITY_BAR: Record<string, string> = {
  critical: 'bg-red-500',
  high:     'bg-orange-400',
  medium:   'bg-blue-400',
  low:      'bg-sidebar-foreground/20',
}

const STATUS_DOT: Record<string, string> = {
  todo:        'bg-sidebar-foreground/30',
  in_progress: 'bg-blue-400',
  done:        'bg-green-500',
  blocked:     'bg-red-500',
  cancelled:   'bg-sidebar-foreground/20',
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo:        'Todo',
  in_progress: 'In Progress',
  done:        'Done',
  blocked:     'Blocked',
  cancelled:   'Cancelled',
}

const FILTER_OPTIONS: Array<{ value: TaskStatus | 'all'; label: string }> = [
  { value: 'all',        label: 'All' },
  { value: 'todo',       label: 'Todo' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done',       label: 'Done' },
  { value: 'blocked',    label: 'Blocked' },
]

function taskSourceLabel(task: OrbitTask): string | null {
  if (task.source.type === 'plugin') return task.source.name
  return null
}

// ── TaskItem ──────────────────────────────────────────────────────────────────

function TaskItem({
  task,
  isSelected,
  isKeySelected,
  onOpen,
  onDelete,
  onStatusChange,
}: {
  task:           OrbitTask
  isSelected:     boolean
  isKeySelected:  boolean
  onOpen:         () => void
  onDelete:       () => void
  onStatusChange: (status: TaskStatus) => void
}) {
  const blurSidebar = useAppStore((s) => s.blurSidebar)
  const itemRef     = useRef<HTMLLIElement>(null)

  useEffect(() => {
    if (isKeySelected && itemRef.current) {
      itemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [isKeySelected])

  const priorityBar = PRIORITY_BAR[task.priority] ?? 'bg-sidebar-foreground/20'
  const statusDot   = STATUS_DOT[task.status]     ?? 'bg-sidebar-foreground/20'
  const sourceLabel = taskSourceLabel(task)

  const rowClass = isSelected
    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
    : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'

  const copyId = () => void navigator.clipboard.writeText(task.id)

  const NEXT_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done', 'blocked', 'cancelled']

  return (
    <li ref={itemRef}>
      <ContextMenu onOpenChange={(open) => { if (open) blurSidebar() }}>
        <ContextMenuContent className="w-52 text-xs">
          <ContextMenuGroup>
            <ContextMenuItem className="text-xs gap-2" onClick={onOpen}>
              <ExternalLink size={13} />Open task
            </ContextMenuItem>
            <ContextMenuItem className="text-xs gap-2" onClick={copyId}>
              <span className="font-mono text-[10px]">{task.id}</span> Copy ID
            </ContextMenuItem>
          </ContextMenuGroup>
          <ContextMenuGroup>
            <ContextMenuLabel>Status</ContextMenuLabel>
            <ContextMenuSub>
              <ContextMenuSubTrigger className="text-xs gap-2">
                Change status…
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-40 text-xs">
                {NEXT_STATUSES.map((s) => (
                  <ContextMenuItem
                    key={s}
                    className="text-xs gap-2"
                    onClick={() => onStatusChange(s)}
                  >
                    {task.status === s && <Check size={11} className="mr-0.5" />}
                    {STATUS_LABELS[s]}
                  </ContextMenuItem>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
          </ContextMenuGroup>
          {task.source.type === 'manual' && (
            <ContextMenuGroup>
              <ContextMenuItem
                className="text-xs gap-2 text-destructive focus:text-destructive"
                onClick={onDelete}
              >
                <Trash2 size={13} />Delete task
              </ContextMenuItem>
            </ContextMenuGroup>
          )}
        </ContextMenuContent>

        <ContextMenuTrigger asChild>
          <button
            className={`w-full flex items-center gap-0 rounded-md text-left transition-colors ${rowClass} ${isKeySelected ? RING_CLASS : ''}`}
            onClick={onOpen}
          >
            {/* Priority bar */}
            <span className={`shrink-0 w-0.5 self-stretch rounded-l-sm mr-2 ${priorityBar}`} />

            <div className="flex-1 min-w-0 py-1.5 pr-2">
              {/* Top row: status dot + ID + source badge */}
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${statusDot}`} />
                <span className="font-mono text-[9px] text-sidebar-foreground/35 shrink-0">{task.id}</span>
                {sourceLabel && (
                  <span className="shrink-0 text-[8px] font-medium uppercase tracking-wide px-1 py-px rounded bg-sidebar-foreground/10 text-sidebar-foreground/40">
                    {sourceLabel}
                  </span>
                )}
              </div>

              {/* Title */}
              <p className="text-xs font-medium leading-snug truncate">{task.title}</p>

              {/* Bottom: scope + time */}
              <div className="flex items-center gap-1 mt-0.5">
                {task.repository && (
                  <span className="text-[9px] text-sidebar-foreground/30 truncate flex-1">{task.repository}</span>
                )}
                <span className="text-[9px] text-sidebar-foreground/25 shrink-0 ml-auto">
                  {relativeTime(task.updated_at)}
                </span>
              </div>
            </div>
          </button>
        </ContextMenuTrigger>
      </ContextMenu>
    </li>
  )
}

// ── NewTaskInput ──────────────────────────────────────────────────────────────

function NewTaskInput({
  workspace,
  onCreated,
  onCancel,
}: {
  workspace: string
  onCreated: (task: OrbitTask) => void
  onCancel:  () => void
}) {
  const createTask = useAppStore((s) => s.createTask)
  const [value,   setValue]   = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const submit = async () => {
    const title = value.trim()
    if (!title) { onCancel(); return }
    setLoading(true)
    try {
      const task = await createTask(workspace, title)
      onCreated(task)
    } finally {
      setLoading(false)
    }
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter')  { e.preventDefault(); void submit() }
    if (e.key === 'Escape') { onCancel() }
  }

  return (
    <li className="px-1 py-1">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => { if (!loading) onCancel() }}
        placeholder="Task title…"
        disabled={loading}
        className="w-full text-xs bg-sidebar-accent/60 text-sidebar-accent-foreground placeholder:text-sidebar-foreground/30 rounded px-2 py-1 outline-none ring-1 ring-inset ring-sidebar-border/60 focus:ring-ring"
      />
    </li>
  )
}

// ── TasksPanel ────────────────────────────────────────────────────────────────

export function TasksPanel({
  tasks,
  loading,
  workspace,
  sidebarFocused,
  sidebarSelectedIdx,
  onOpen,
}: {
  tasks:               OrbitTask[]
  loading:             boolean
  workspace:           string
  sidebarFocused:      boolean
  sidebarSelectedIdx:  number
  onOpen:              (task: OrbitTask) => void
}) {
  const updateTask  = useAppStore((s) => s.updateTask)
  const deleteTask  = useAppStore((s) => s.deleteTask)
  const openTask    = useAppStore((s) => s.openTask)

  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all')
  const [adding, setAdding]             = useState(false)

  const filtered = filterStatus === 'all'
    ? tasks
    : tasks.filter((t) => t.status === filterStatus)

  const handleCreated = (task: OrbitTask) => {
    setAdding(false)
    openTask(task)
  }

  const handleStatusChange = (task: OrbitTask, status: TaskStatus) => {
    void updateTask(task.workspace, task.id, { status })
  }

  const handleDelete = (task: OrbitTask) => {
    void deleteTask(task.workspace, task.id)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div className="flex items-center gap-0.5 px-1.5 pb-1.5 shrink-0 flex-wrap">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilterStatus(opt.value)}
            className={`text-[9px] font-medium px-1.5 py-0.5 rounded transition-colors ${
              filterStatus === opt.value
                ? 'bg-sidebar-foreground/15 text-sidebar-foreground/80'
                : 'text-sidebar-foreground/30 hover:text-sidebar-foreground/60 hover:bg-sidebar-foreground/8'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* + New Task */}
      <div className="px-1.5 pb-1.5 shrink-0">
        {!adding ? (
          <button
            onClick={() => setAdding(true)}
            className="w-full flex items-center gap-1.5 text-[10px] text-sidebar-foreground/35 hover:text-sidebar-foreground/60 px-1.5 py-1 rounded hover:bg-sidebar-foreground/6 transition-colors"
          >
            <Plus size={11} />New task
          </button>
        ) : (
          <ul className="list-none p-0 m-0">
            <NewTaskInput
              workspace={workspace}
              onCreated={handleCreated}
              onCancel={() => setAdding(false)}
            />
          </ul>
        )}
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading && filtered.length === 0 && (
          <p className="text-[10px] text-sidebar-foreground/25 px-3 pt-1 italic">Loading…</p>
        )}
        {!loading && filtered.length === 0 && (
          <p className="text-[10px] text-sidebar-foreground/25 px-3 pt-1 italic">
            {filterStatus === 'all' ? 'No tasks yet' : `No ${STATUS_LABELS[filterStatus as TaskStatus]?.toLowerCase()} tasks`}
          </p>
        )}
        {filtered.length > 0 && (
          <div className="pr-2 pt-1 pb-2 px-1">
            <MarkerSeparator label={FILTER_OPTIONS.find((o) => o.value === filterStatus)?.label ?? 'Tasks'} />
          </div>
        )}
        <ul className="list-none p-0 m-0 space-y-px px-1">
          {filtered.map((task, idx) => (
            <TaskItem
              key={task.id}
              task={task}
              isSelected={false}
              isKeySelected={sidebarFocused && sidebarSelectedIdx === idx}
              onOpen={() => onOpen(task)}
              onDelete={() => handleDelete(task)}
              onStatusChange={(status) => handleStatusChange(task, status)}
            />
          ))}
        </ul>
      </div>
    </div>
  )
}
