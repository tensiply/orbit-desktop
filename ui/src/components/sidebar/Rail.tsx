import {
  ListChecks, Terminal, FileText, LayoutGrid, Server,
  Network, Settings, Files,
} from 'lucide-react'
import { useAppStore } from '../../store'
import type { NavView } from '../../types'
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '../ui/sidebar'
import { Kbd } from '../ui/kbd'

export const PANEL_LABELS: Partial<Record<NavView, string>> = {
  terminal:     'Sessions',
  tasks:        'Tasks',
  plans:        'Plans',
  plugins:      'Plugins',
  mcps:         'MCPs',
  activity:     'Activity',
  documents:    'Files',
  architecture: 'Architecture',
  profile:      'Profile',
  docs:         'Documentation',
  settings:     'Settings',
}

type RailItem = { label: string; view: NavView; icon: React.ReactNode; shortcut?: string }

export const NAV_ITEMS: RailItem[] = [
  { label: 'Tasks',        view: 'tasks',        icon: <ListChecks />, shortcut: 'Ctrl+1' },
  { label: 'Sessions',     view: 'terminal',     icon: <Terminal />,   shortcut: 'Ctrl+2' },
  { label: 'Files',        view: 'documents',    icon: <Files />,      shortcut: 'Ctrl+3' },
  { label: 'Plans',        view: 'plans',        icon: <FileText />,   shortcut: 'Ctrl+4' },
  { label: 'Architecture', view: 'architecture', icon: <Network />,    shortcut: 'Ctrl+5' },
]

export const BOTTOM_NAV_ITEMS: RailItem[] = [
  { label: 'Plugins', view: 'plugins', icon: <LayoutGrid />, shortcut: 'Ctrl+6' },
  { label: 'MCPs',    view: 'mcps',    icon: <Server />,     shortcut: 'Ctrl+7' },
]

export function RailButton({
  item,
  active,
  onClick,
}: {
  item: RailItem
  active: boolean
  onClick: () => void
}) {
  const tooltip = item.shortcut
    ? {
        children: (
          <span className="flex items-center gap-2">
            {item.label}
            <Kbd className="text-[9px] px-1 py-px border-foreground/20 text-foreground/50 bg-transparent">
              {item.shortcut}
            </Kbd>
          </span>
        ),
      }
    : item.label

  return (
    <SidebarMenuItem className="w-full flex justify-center">
      <SidebarMenuButton
        isActive={active}
        tooltip={tooltip}
        onClick={onClick}
        className="!size-8 !p-0 !justify-center"
      >
        {item.icon}
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export function SettingsRailButton() {
  const setNavView      = useAppStore((s) => s.setNavView)
  const navView         = useAppStore((s) => s.navView)
  const setupStatus     = useAppStore((s) => s.setupStatus)
  const updateCheck     = useAppStore((s) => s.updateCheck)
  const setupIncomplete  = setupStatus !== null && (!setupStatus.cli_installed || !setupStatus.has_workspaces)
  const updatesAvailable = updateCheck
    ? (updateCheck.cli.has_update || updateCheck.desktop.has_update)
    : false
  const hasBadge = setupIncomplete || updatesAvailable
  const isActive = navView === 'settings'

  return (
    <SidebarMenuItem className="w-full flex justify-center">
      <SidebarMenuButton
        isActive={isActive}
        tooltip={{ children: <span className="flex items-center gap-2">Settings <Kbd className="text-[9px] px-1 py-px border-foreground/20 text-foreground/50 bg-transparent">Ctrl+9</Kbd></span> }}
        className="!size-8 !p-0 !justify-center relative"
        onClick={() => setNavView(isActive ? 'terminal' : 'settings')}
      >
        <Settings />
        {hasBadge && (
          <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-primary" />
        )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

