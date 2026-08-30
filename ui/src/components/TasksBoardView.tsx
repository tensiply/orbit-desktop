import { useState, useMemo } from 'react'
import { List, Columns3, BarChart3, type LucideIcon } from 'lucide-react'
import type { OrbitTask, TaskStatus, TaskPriority } from '../types'
import { useAppStore } from '../store'

// ── helpers ───────────────────────────────────────────────────────────────────

type BoardView = 'backlog' | 'kanban' | 'timeline'

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo:        'Todo',
  in_progress: 'In Progress',
  done:        'Done',
  blocked:     'Blocked',
  cancelled:   'Cancelled',
}

const STATUS_COLOR: Record<TaskStatus, string> = {
  todo:        'text-foreground/40',
  in_progress: 'text-blue-400',
  done:        'text-green-500',
  blocked:     'text-red-500',
  cancelled:   'text-foreground/25',
}

const PRIORITY_BAR: Record<TaskPriority, string> = {
  critical: 'bg-red-500',
  high:     'bg-orange-400',
  medium:   'bg-blue-400',
  low:      'bg-foreground/20',
}

const PRIORITY_TEXT: Record<TaskPriority, string> = {
  critical: 'text-red-500',
  high:     'text-orange-400',
  medium:   'text-blue-400',
  low:      'text-foreground/35',
}

const BAR_COLOR: Record<TaskStatus, string> = {
  todo:        'var(--color-foreground)',
  in_progress: '#60a5fa',
  done:        '#4ade80',
  blocked:     '#f87171',
  cancelled:   '#374151',
}

function fmtDate(secs: number): string {
  return new Date(secs * 1000).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric',
  })
}

function scopeCrumb(task: OrbitTask): string {
  return [task.tenant, task.project, task.repository].filter(Boolean).join(' › ')
}

// ── Backlog ───────────────────────────────────────────────────────────────────

function BacklogView({ tasks, onOpen }: { tasks: OrbitTask[]; onOpen: (t: OrbitTask) => void }) {
  const sorted = useMemo(() => {
    const ORDER: Record<TaskPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 }
    return [...tasks].sort((a, b) => ORDER[a.priority] - ORDER[b.priority])
  }, [tasks])

  return (
    <div className="flex-1 overflow-y-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="sticky top-0 z-10 bg-card border-b border-border/30">
            <th className="text-left text-[10px] font-medium text-foreground/40 uppercase tracking-wider px-4 py-2.5 w-20">Priority</th>
            <th className="text-left text-[10px] font-medium text-foreground/40 uppercase tracking-wider px-2 py-2.5 w-28">Status</th>
            <th className="text-left text-[10px] font-medium text-foreground/40 uppercase tracking-wider px-2 py-2.5">Title</th>
            <th className="text-left text-[10px] font-medium text-foreground/40 uppercase tracking-wider px-2 py-2.5 w-36 hidden md:table-cell">Scope</th>
            <th className="text-left text-[10px] font-medium text-foreground/40 uppercase tracking-wider px-4 py-2.5 w-20">Updated</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((task) => (
            <tr
              key={task.id}
              onClick={() => onOpen(task)}
              className="border-b border-border/10 hover:bg-foreground/4 cursor-pointer transition-colors group"
            >
              <td className="px-4 py-2.5">
                <span className={`text-[10px] font-semibold capitalize ${PRIORITY_TEXT[task.priority]}`}>
                  {task.priority}
                </span>
              </td>
              <td className="px-2 py-2.5">
                <span className={`text-[10px] font-medium ${STATUS_COLOR[task.status]}`}>
                  {STATUS_LABEL[task.status]}
                </span>
              </td>
              <td className="px-2 py-2.5 max-w-0">
                <span className="text-sm font-medium text-foreground/75 group-hover:text-foreground leading-snug block truncate">
                  {task.title}
                </span>
                {task.tags.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {task.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-[9px] px-1.5 py-px rounded-full bg-foreground/8 text-foreground/40">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </td>
              <td className="px-2 py-2.5 hidden md:table-cell">
                <span className="text-[10px] text-foreground/30 truncate block">{scopeCrumb(task)}</span>
              </td>
              <td className="px-4 py-2.5">
                <span className="text-[10px] text-foreground/30">{fmtDate(task.updated_at)}</span>
              </td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-12 text-center text-[11px] text-foreground/25 italic">
                No tasks yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// ── Kanban ────────────────────────────────────────────────────────────────────

const KANBAN_COLUMNS: Array<{ status: TaskStatus }> = [
  { status: 'todo' },
  { status: 'in_progress' },
  { status: 'blocked' },
  { status: 'done' },
  { status: 'cancelled' },
]

function KanbanCard({ task, onOpen }: { task: OrbitTask; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="w-full text-left rounded-lg bg-sidebar border border-border/30 hover:border-border/60 hover:shadow-sm transition-all group flex gap-0"
    >
      <span className={`shrink-0 w-1 self-stretch rounded-l-lg ${PRIORITY_BAR[task.priority]}`} />
      <div className="flex-1 min-w-0 p-3">
        <p className="text-[11px] font-medium text-foreground/75 group-hover:text-foreground leading-snug line-clamp-2">
          {task.title}
        </p>
        {task.tags.length > 0 && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {task.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-[8px] px-1.5 py-0.5 rounded-full bg-foreground/8 text-foreground/40">
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[9px] text-foreground/25">{fmtDate(task.updated_at)}</span>
          {scopeCrumb(task) && (
            <span className="text-[9px] text-foreground/20 truncate">{scopeCrumb(task)}</span>
          )}
        </div>
      </div>
    </button>
  )
}

function KanbanView({ tasks, onOpen }: { tasks: OrbitTask[]; onOpen: (t: OrbitTask) => void }) {
  const byStatus = useMemo(() => {
    const map: Record<TaskStatus, OrbitTask[]> = {
      todo: [], in_progress: [], done: [], blocked: [], cancelled: [],
    }
    tasks.forEach((t) => map[t.status].push(t))
    return map
  }, [tasks])

  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden">
      <div className="flex gap-3 h-full px-4 py-4 min-w-max">
        {KANBAN_COLUMNS.map(({ status }) => (
          <div key={status} className="flex flex-col w-64 shrink-0">
            <div className="flex items-center gap-2 mb-3 px-1">
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${STATUS_COLOR[status]}`}>
                {STATUS_LABEL[status]}
              </span>
              <span className="text-[9px] text-foreground/25 font-mono tabular-nums bg-foreground/6 px-1.5 py-0.5 rounded-full">
                {byStatus[status].length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
              {byStatus[status].map((task) => (
                <KanbanCard key={task.id} task={task} onOpen={() => onOpen(task)} />
              ))}
              {byStatus[status].length === 0 && (
                <div className="rounded-lg border border-dashed border-border/20 py-8 flex items-center justify-center">
                  <span className="text-[10px] text-foreground/15 italic">Empty</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Timeline ──────────────────────────────────────────────────────────────────

function TimelineView({ tasks }: { tasks: OrbitTask[] }) {
  const now = Math.floor(Date.now() / 1000)

  const sorted = useMemo(
    () => [...tasks].sort((a, b) => a.created_at - b.created_at),
    [tasks],
  )

  if (sorted.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-[11px] text-foreground/25 italic">No tasks to display</span>
      </div>
    )
  }

  const minTs = sorted[0].created_at
  const maxTs = Math.max(...sorted.map((t) => Math.max(t.updated_at, now)))
  const range = maxTs - minTs || 86400

  const ROW_H   = 32
  const LABEL_W = 200
  const BAR_W   = 520
  const SVG_W   = LABEL_W + BAR_W + 24
  const ROWS    = sorted.length
  const AXIS_H  = 28
  const SVG_H   = ROWS * ROW_H + AXIS_H

  const toX = (ts: number) => LABEL_W + ((ts - minTs) / range) * BAR_W

  const ticks = Array.from({ length: 5 }, (_, i) => minTs + (i / 4) * range)

  return (
    <div className="flex-1 overflow-auto px-6 py-6">
      <svg
        width={SVG_W}
        height={SVG_H}
        className="select-none overflow-visible"
        style={{ fontFamily: 'inherit' }}
      >
        {/* Column grid */}
        {ticks.map((ts, i) => (
          <g key={i}>
            <line
              x1={toX(ts)} y1={0}
              x2={toX(ts)} y2={ROWS * ROW_H}
              stroke="currentColor" strokeOpacity={0.07} strokeWidth={1}
            />
            <text
              x={toX(ts)} y={ROWS * ROW_H + 18}
              fontSize={9} fill="currentColor" fillOpacity={0.3}
              textAnchor="middle"
            >
              {fmtDate(ts)}
            </text>
          </g>
        ))}

        {/* Today marker */}
        {now >= minTs && now <= maxTs && (
          <>
            <line
              x1={toX(now)} y1={0}
              x2={toX(now)} y2={ROWS * ROW_H}
              stroke="#60a5fa" strokeOpacity={0.35} strokeWidth={1}
              strokeDasharray="4 3"
            />
            <text
              x={toX(now)} y={ROWS * ROW_H + 18}
              fontSize={8} fill="#60a5fa" fillOpacity={0.6}
              textAnchor="middle"
            >
              today
            </text>
          </>
        )}

        {/* Task rows */}
        {sorted.map((task, idx) => {
          const y  = idx * ROW_H
          const x1 = toX(task.created_at)
          const endsAt = task.status === 'done' || task.status === 'cancelled'
            ? task.updated_at
            : now
          const x2 = toX(Math.min(endsAt, maxTs))
          const barW = Math.max(x2 - x1, 6)
          const barColor = BAR_COLOR[task.status]
          const label = task.title.length > 26
            ? task.title.slice(0, 26) + '…'
            : task.title

          return (
            <g key={task.id}>
              {idx % 2 === 0 && (
                <rect
                  x={0} y={y}
                  width={SVG_W} height={ROW_H}
                  fill="currentColor" fillOpacity={0.025}
                />
              )}
              <text
                x={LABEL_W - 10} y={y + ROW_H / 2 + 4}
                fontSize={10} fill="currentColor" fillOpacity={0.55}
                textAnchor="end"
              >
                {label}
              </text>
              <rect
                x={x1} y={y + 9}
                width={barW} height={ROW_H - 18}
                rx={3}
                fill={barColor}
                fillOpacity={task.status === 'cancelled' ? 0.4 : 0.65}
              />
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── TasksBoardView ────────────────────────────────────────────────────────────

const VIEWS: Array<{ id: BoardView; label: string; Icon: LucideIcon }> = [
  { id: 'backlog',  label: 'Backlog',  Icon: List },
  { id: 'kanban',   label: 'Kanban',   Icon: Columns3 },
  { id: 'timeline', label: 'Timeline', Icon: BarChart3 },
]

export function TasksBoardView() {
  const [activeView, setActiveView] = useState<BoardView>('backlog')
  const tasks    = useAppStore((s) => s.tasks)
  const openTask = useAppStore((s) => s.openTask)

  return (
    <div className="flex flex-col h-full bg-card">
      {/* View switcher header */}
      <div className="shrink-0 flex items-center gap-1 px-4 py-2.5 border-b border-border/30">
        {VIEWS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveView(id)}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
              activeView === id
                ? 'bg-foreground/10 text-foreground'
                : 'text-foreground/40 hover:text-foreground/70 hover:bg-foreground/6'
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-foreground/25 font-mono tabular-nums">
          {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
        </span>
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {activeView === 'backlog'  && <BacklogView  tasks={tasks} onOpen={openTask} />}
        {activeView === 'kanban'   && <KanbanView   tasks={tasks} onOpen={openTask} />}
        {activeView === 'timeline' && <TimelineView tasks={tasks} />}
      </div>
    </div>
  )
}
