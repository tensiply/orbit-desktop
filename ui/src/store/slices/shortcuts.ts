import type { StateCreator } from 'zustand'
import type { Shortcut, ShortcutCategory } from '../../types'
import type { AppStore } from '../types'

const DEFAULT_SHORTCUTS: Shortcut[] = [
  // navigation
  { id: 'new-shell',         name: 'New Shell',           description: 'Open a new terminal shell',                         keys: '',           action: 'new_shell',        category: 'navigation', builtin: true },
  { id: 'close-tab',         name: 'Close Tab',            description: 'Close the active tab',                              keys: 'Ctrl+W',     action: 'close_tab',        category: 'navigation', builtin: true },
  { id: 'next-tab',          name: 'Next Tab',             description: 'Switch to the next tab',                            keys: 'Ctrl+Tab',   action: 'next_tab',         category: 'navigation', builtin: true },
  { id: 'prev-tab',          name: 'Previous Tab',         description: 'Switch to the previous tab',                        keys: 'Ctrl+⇧+Tab', action: 'prev_tab',         category: 'navigation', builtin: true },
  { id: 'focus-sessions',    name: 'Focus Sidebar List',   description: 'Focus the active sidebar list (sessions or files)', keys: 'Ctrl+Q',     action: 'focus_sessions',   category: 'navigation', builtin: true },
  // rail shortcuts — Ctrl+number
  { id: 'nav-tasks',         name: 'Go to Tasks',          description: 'Switch sidebar to the Tasks panel',                 keys: 'Ctrl+1',     action: 'nav_tasks',        category: 'navigation', builtin: true },
  { id: 'nav-sessions',      name: 'Go to Sessions',       description: 'Switch sidebar to the Sessions panel',              keys: 'Ctrl+2',     action: 'nav_sessions',     category: 'navigation', builtin: true },
  { id: 'nav-documents',     name: 'Go to Files',          description: 'Switch sidebar to the Files panel',                 keys: 'Ctrl+3',     action: 'nav_documents',    category: 'navigation', builtin: true },
  { id: 'nav-plans',         name: 'Go to Plans',          description: 'Switch sidebar to the Plans panel',                 keys: 'Ctrl+4',     action: 'nav_plans',        category: 'navigation', builtin: true },
  { id: 'nav-architecture',  name: 'Go to Architecture',   description: 'Switch sidebar to the Architecture panel',          keys: 'Ctrl+5',     action: 'nav_architecture', category: 'navigation', builtin: true },
  { id: 'nav-plugins',       name: 'Go to Plugins',        description: 'Switch sidebar to the Plugins panel',               keys: 'Ctrl+6',     action: 'nav_plugins',      category: 'navigation', builtin: true },
  { id: 'nav-mcps',          name: 'Go to MCPs',           description: 'Switch sidebar to the MCPs panel',                  keys: 'Ctrl+7',     action: 'nav_mcps',         category: 'navigation', builtin: true },
  { id: 'nav-docs',          name: 'Go to Documentation',  description: 'Switch sidebar to the Documentation panel',         keys: 'Ctrl+8',     action: 'nav_docs',         category: 'navigation', builtin: true },
  { id: 'nav-settings-9',    name: 'Open Settings Menu',   description: 'Open the settings dropdown menu',                  keys: 'Ctrl+9',     action: 'open_settings_menu', category: 'navigation', builtin: true },
  { id: 'nav-profile',       name: 'Go to Profile',        description: 'Switch sidebar to the Profile panel',               keys: 'Ctrl+0',     action: 'nav_profile',      category: 'navigation', builtin: true },
  // terminal
  { id: 'toggle-drawer',     name: 'Terminal Drawer',     description: 'Open/close the right-side terminal',    keys: 'Ctrl+T',         action: 'toggle_drawer',     category: 'terminal',   builtin: true },
  { id: 'restart-session',   name: 'Restart Session',     description: 'Restart the active session in tmux',    keys: 'Ctrl+⇧+R',       action: 'restart_session',   category: 'terminal',   builtin: true },
  { id: 'duplicate-session', name: 'Duplicate Session',   description: 'Duplicate the active session',          keys: 'Ctrl+⇧+T',       action: 'duplicate_session', category: 'terminal',   builtin: true },
  { id: 'end-session',       name: 'End Session',         description: 'Kill the active session',               keys: 'Ctrl+⇧+W',       action: 'end_session',       category: 'terminal',   builtin: true },
  { id: 'focus-next-panel', name: 'Focus Right Panel',   description: 'Move focus to the right panel',         keys: 'Ctrl+ArrowRight', action: 'focus_next_panel',  category: 'terminal',   builtin: true },
  { id: 'focus-prev-panel', name: 'Focus Left Panel',    description: 'Move focus to the left panel',          keys: 'Ctrl+ArrowLeft',  action: 'focus_prev_panel',  category: 'terminal',   builtin: true },
  { id: 'clear',             name: 'Clear',               description: 'Clear the terminal output',             keys: 'Ctrl+L',         action: 'clear',            category: 'terminal',   builtin: true },
  { id: 'scroll-up',         name: 'Scroll Up',           description: 'Scroll terminal output up',             keys: 'Shift+PageUp',   action: 'scroll_up',        category: 'terminal',   builtin: true },
  { id: 'scroll-down',       name: 'Scroll Down',         description: 'Scroll terminal output down',           keys: 'Shift+PageDown', action: 'scroll_down',      category: 'terminal',   builtin: true },
  // app
  { id: 'toggle-sidebar',    name: 'Toggle Sidebar',      description: 'Show or hide the sidebar',              keys: 'Ctrl+B',         action: 'toggle_sidebar',   category: 'app',        builtin: true },
  { id: 'shortcuts',         name: 'Shortcuts',            description: 'Open keyboard shortcuts settings',      keys: 'Ctrl+,',         action: 'open_shortcuts',   category: 'app',        builtin: true },
  { id: 'settings',          name: 'Settings',             description: 'Open settings',                         keys: 'Ctrl+.',         action: 'open_settings',    category: 'app',        builtin: true },
  { id: 'toggle-theme',      name: 'Toggle Theme',         description: 'Switch between dark and light',         keys: '',               action: 'toggle_theme',     category: 'app',        builtin: true },
]

// Bump this key name whenever defaults change to avoid stale user overrides.
const STORAGE_KEY = 'orbit-shortcuts-v8'

function loadShortcuts(): Shortcut[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SHORTCUTS
    const saved: Shortcut[] = JSON.parse(raw)
    const savedById = new Map(saved.map((s) => [s.id, s]))
    const builtins = DEFAULT_SHORTCUTS.map((d) => {
      const override = savedById.get(d.id)
      return override ? { ...d, keys: override.keys } : d
    })
    const custom = saved.filter((s) => !s.builtin)
    return [...builtins, ...custom]
  } catch {
    return DEFAULT_SHORTCUTS
  }
}

function persistShortcuts(shortcuts: Shortcut[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(shortcuts))
}

export interface ShortcutsSlice {
  shortcuts: Shortcut[]

  addShortcut: (shortcut: Omit<Shortcut, 'id' | 'builtin'>) => void
  updateShortcut: (
    id: string,
    updates: Partial<Pick<Shortcut, 'keys' | 'name' | 'description' | 'action' | 'category'>>,
  ) => void
  deleteShortcut: (id: string) => void
  resetShortcuts: () => void
}

export const createShortcutsSlice: StateCreator<AppStore, [], [], ShortcutsSlice> = (set, get) => ({
  shortcuts: loadShortcuts(),

  addShortcut: (shortcut) => {
    const newShortcut: Shortcut = { ...shortcut, id: `custom-${Date.now()}`, builtin: false }
    const shortcuts = [...get().shortcuts, newShortcut]
    persistShortcuts(shortcuts)
    set({ shortcuts })
  },

  updateShortcut: (id, updates) => {
    const shortcuts = get().shortcuts.map((s) => (s.id === id ? { ...s, ...updates } : s))
    persistShortcuts(shortcuts)
    set({ shortcuts })
  },

  deleteShortcut: (id) => {
    const shortcut = get().shortcuts.find((s) => s.id === id)
    if (!shortcut || shortcut.builtin) return
    const shortcuts = get().shortcuts.filter((s) => s.id !== id)
    persistShortcuts(shortcuts)
    set({ shortcuts })
  },

  resetShortcuts: () => {
    persistShortcuts(DEFAULT_SHORTCUTS)
    set({ shortcuts: DEFAULT_SHORTCUTS })
  },
})

// Re-export for external access (e.g. ShortcutsView category labels)
export type { ShortcutCategory }
