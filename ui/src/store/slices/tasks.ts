import type { StateCreator } from 'zustand'
import { invoke } from '@tauri-apps/api/core'
import type { AppStore } from '../types'
import type { OrbitTask } from '../../types'

export interface TasksSlice {
  tasks: OrbitTask[]
  tasksLoading: boolean

  fetchTasks: (workspace: string, statusFilter?: string, sourceFilter?: string) => Promise<void>
  openTask: (task: OrbitTask) => void
  createTask: (workspace: string, title: string, opts?: { priority?: string; tenant?: string; project?: string; repository?: string }) => Promise<OrbitTask>
  updateTask: (workspace: string, id: string, patch: { title?: string; description?: string | null; status?: string; priority?: string; tags?: string[] }) => Promise<void>
  deleteTask: (workspace: string, id: string) => Promise<void>
}

export const createTasksSlice: StateCreator<AppStore, [], [], TasksSlice> = (set, get) => ({
  tasks: [],
  tasksLoading: false,

  fetchTasks: async (workspace, statusFilter, sourceFilter) => {
    set({ tasksLoading: true })
    try {
      const tasks = await invoke<OrbitTask[]>('task_list', {
        workspace,
        statusFilter: statusFilter ?? null,
        sourceFilter: sourceFilter ?? null,
        tenant:     null,
        project:    null,
        repository: null,
      })
      set({ tasks, tasksLoading: false })
    } catch {
      set({ tasksLoading: false })
    }
  },

  openTask: (task: OrbitTask) => {
    const tabId = `task-${task.id}`
    const existing = get().tabs.find((t) => t.id === tabId)
    if (existing) {
      set({ activeTabId: tabId })
      return
    }
    const tab = { id: tabId, title: task.id, type: 'task' as const, taskId: task.id }
    set((s) => ({ tabs: [...s.tabs, tab], activeTabId: tabId }))
  },

  createTask: async (workspace, title, opts = {}) => {
    const task = await invoke<OrbitTask>('task_create', {
      args: {
        workspace,
        title,
        description: null,
        priority: opts.priority ?? 'medium',
        tenant:     opts.tenant     ?? null,
        project:    opts.project    ?? null,
        repository: opts.repository ?? null,
        tags: [],
      },
    })
    set((s) => ({ tasks: [task, ...s.tasks] }))
    return task
  },

  updateTask: async (workspace, id, patch) => {
    const updated = await invoke<OrbitTask>('task_update', {
      args: {
        workspace,
        id,
        title:       patch.title       ?? null,
        description: patch.description !== undefined ? patch.description : null,
        status:      patch.status      ?? null,
        priority:    patch.priority    ?? null,
        tags:        patch.tags        ?? null,
      },
    })
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? updated : t)),
    }))
  },

  deleteTask: async (workspace, id) => {
    await invoke('task_delete', { workspace, id })
    const tabId = `task-${id}`
    set((s) => ({
      tasks: s.tasks.filter((t) => t.id !== id),
      tabs: s.tabs.filter((t) => t.id !== tabId),
      activeTabId: s.activeTabId === tabId
        ? (s.tabs.find((t) => t.id !== tabId)?.id ?? null)
        : s.activeTabId,
    }))
  },
})
