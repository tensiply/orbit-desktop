import type { StateCreator } from 'zustand'
import type { AppStore } from '../types'

// In-app notification history. Toasts are ephemeral; this keeps a session-scoped
// log so the bell in the title bar can show what was already surfaced. Fed from
// useSessionNotifications (session lifecycle + MCP `debug:notify`). Not persisted
// on purpose — history resets with the app.
export type NotificationLevel = 'success' | 'error' | 'info' | 'warning' | 'message'

export interface AppNotification {
  id: string
  title: string
  description?: string
  level: NotificationLevel
  at: number
  read: boolean
}

const MAX_HISTORY = 100
let seq = 0

export interface NotificationsSlice {
  notifications: AppNotification[]
  /** Record a notification in history (newest first, capped at MAX_HISTORY). */
  pushNotification: (n: { title: string; description?: string; level?: NotificationLevel }) => void
  /** Mark every notification as read (called when the history panel opens). */
  markNotificationsRead: () => void
  /** Drop all notification history. */
  clearNotifications: () => void
}

export const createNotificationsSlice: StateCreator<AppStore, [], [], NotificationsSlice> = (set) => ({
  notifications: [],

  pushNotification: ({ title, description, level = 'message' }) =>
    set((s) => {
      const entry: AppNotification = {
        id: `${Date.now()}-${seq++}`,
        title,
        description,
        level,
        at: Date.now(),
        read: false,
      }
      return { notifications: [entry, ...s.notifications].slice(0, MAX_HISTORY) }
    }),

  markNotificationsRead: () =>
    set((s) => {
      if (s.notifications.every((n) => n.read)) return s
      return { notifications: s.notifications.map((n) => (n.read ? n : { ...n, read: true })) }
    }),

  clearNotifications: () => set({ notifications: [] }),
})
