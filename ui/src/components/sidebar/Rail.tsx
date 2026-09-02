import {
  ListChecks, Terminal, FileText, LayoutGrid, Server,
  Settings, Files,
} from 'lucide-react'
import { useAppStore } from '../../store'
import type { NavView } from '../../types'
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '../ui/sidebar'

export const PANEL_LABELS: Partial<Record<NavView, string>> = {
  terminal:  'Sessions',
  tasks:     'Tasks',
  plans:     'Plans',
  plugins:   'Plugins',
  mcps:      'MCPs',
  activity:  'Activity',
  documents: 'Files',
  profile:   'Profile',
  docs:      'Documentation',
  settings:  'Settings',
}

type RailItem = { label: string; view: NavView; icon: React.ReactNode }

export const NAV_ITEMS: RailItem[] = [
  { label: 'Tasks',    view: 'tasks',     icon: <ListChecks /> },
  { label: 'Sessions', view: 'terminal',  icon: <Terminal />   },
  { label: 'Files',    view: 'documents', icon: <Files />      },
  { label: 'Plans',    view: 'plans',     icon: <FileText />   },
]

export const BOTTOM_NAV_ITEMS: RailItem[] = [
  { label: 'Plugins', view: 'plugins', icon: <LayoutGrid /> },
  { label: 'MCPs',    view: 'mcps',    icon: <Server />     },
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
  return (
    <SidebarMenuItem className="w-full flex justify-center">
      <SidebarMenuButton
        isActive={active}
        tooltip={item.label}
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
        tooltip="Settings"
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
