import {
  ListChecks, Terminal, FileText, LayoutGrid, Server, Activity,
  Network, BookOpen, Settings, Keyboard, User, Sun, Moon,
  Files,
} from 'lucide-react'
import { useAppStore } from '../../store'
import type { NavView } from '../../types'
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '../ui/sidebar'
import { Separator } from '../ui/separator'
import { Kbd } from '../ui/kbd'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuShortcut,
} from '../ui/dropdown-menu'

export const PANEL_LABELS: Partial<Record<NavView, string>> = {
  terminal:     'Sessions',
  tasks:        'Tasks',
  plans:        'Plans',
  plugins:      'Plugins',
  mcps:         'MCPs',
  activity:     'Activity',
  documents:    'Documents',
  architecture: 'Architecture',
  profile:      'Profile',
  docs:         'Documentation',
}

type RailItem = { label: string; view: NavView; icon: React.ReactNode }

export const NAV_ITEMS: RailItem[] = [
  { label: 'Tasks',        view: 'tasks',        icon: <ListChecks /> },
  { label: 'Sessions',     view: 'terminal',     icon: <Terminal /> },
  { label: 'Documents',    view: 'documents',    icon: <Files /> },
  { label: 'Plans',        view: 'plans',        icon: <FileText /> },
  { label: 'Plugins',      view: 'plugins',      icon: <LayoutGrid /> },
  { label: 'MCPs',         view: 'mcps',         icon: <Server /> },
  { label: 'Activity',     view: 'activity',     icon: <Activity /> },
  { label: 'Architecture', view: 'architecture', icon: <Network /> },
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
  const openShortcuts = useAppStore((s) => s.openShortcuts)
  const openSettings  = useAppStore((s) => s.openSettings)
  const theme         = useAppStore((s) => s.theme)
  const toggleTheme   = useAppStore((s) => s.toggleTheme)
  const blurSidebar   = useAppStore((s) => s.blurSidebar)

  return (
    <SidebarMenuItem className="w-full flex justify-center">
      <DropdownMenu onOpenChange={(open) => { if (open) blurSidebar() }}>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton tooltip="Settings" className="!size-8 !p-0 !justify-center">
            <Settings />
          </SidebarMenuButton>
        </DropdownMenuTrigger>

        <DropdownMenuContent side="right" align="end" className="w-64">
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Settings
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-xs gap-2" onClick={openSettings}>
            <Settings />
            Settings
            <DropdownMenuShortcut className="flex items-center gap-0.5">
              <Kbd className="text-[9px] px-1 py-px border-foreground/20 text-foreground/50">Ctrl</Kbd>
              <span className="text-[9px] text-foreground/25">+</span>
              <Kbd className="text-[9px] px-1 py-px border-foreground/20 text-foreground/50">.</Kbd>
            </DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem className="text-xs gap-2" onClick={openShortcuts}>
            <Keyboard />
            Keyboard Shortcuts
            <DropdownMenuShortcut className="flex items-center gap-0.5">
              <Kbd className="text-[9px] px-1 py-px border-foreground/20 text-foreground/50">Ctrl</Kbd>
              <span className="text-[9px] text-foreground/25">+</span>
              <Kbd className="text-[9px] px-1 py-px border-foreground/20 text-foreground/50">,</Kbd>
            </DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-xs gap-2" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun /> : <Moon />}
            {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}

