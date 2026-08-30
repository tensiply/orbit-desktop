import { useState, useEffect } from 'react'
import {
  ListChecks, Terminal, FileText, LayoutGrid, Server, Activity,
  Network, BookOpen, Settings, Keyboard, User, Sun, Moon,
  Files, Download, Package,
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
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
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
  documents:    'Files',
  architecture: 'Architecture',
  profile:      'Profile',
  docs:         'Documentation',
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
  const openShortcuts   = useAppStore((s) => s.openShortcuts)
  const openSettings    = useAppStore((s) => s.openSettings)
  const theme           = useAppStore((s) => s.theme)
  const toggleTheme     = useAppStore((s) => s.toggleTheme)
  const blurSidebar     = useAppStore((s) => s.blurSidebar)
  const cliInfo         = useAppStore((s) => s.cliInfo)
  const updateCheck     = useAppStore((s) => s.updateCheck)
  const openWizard      = useAppStore((s) => s.openInstallWizard)
  const setNavView      = useAppStore((s) => s.setNavView)
  const cliNotInstalled  = cliInfo !== null && !cliInfo.installed
  const updatesAvailable = updateCheck
    ? (updateCheck.cli.has_update || updateCheck.desktop.has_update)
    : false
  const hasBadge = cliNotInstalled || updatesAvailable

  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = () => { blurSidebar(); setOpen(true) }
    window.addEventListener('orbit:open-settings-menu', handler)
    return () => window.removeEventListener('orbit:open-settings-menu', handler)
  }, [blurSidebar])

  return (
    <SidebarMenuItem className="w-full flex justify-center">
      <DropdownMenu open={open} onOpenChange={(o) => { setOpen(o); if (o) blurSidebar() }}>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            tooltip={{ children: <span className="flex items-center gap-2">Settings <Kbd className="text-[9px] px-1 py-px border-foreground/20 text-foreground/50 bg-transparent">Ctrl+9</Kbd></span> }}
            className="!size-8 !p-0 !justify-center relative"
          >
            <Settings />
            {hasBadge && (
              <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-primary" />
            )}
          </SidebarMenuButton>
        </DropdownMenuTrigger>

        <DropdownMenuContent side="right" align="end" className="w-64" onCloseAutoFocus={(e) => e.preventDefault()}>
          <DropdownMenuGroup>
            <DropdownMenuLabel className="pt-1">Settings</DropdownMenuLabel>
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
            <DropdownMenuItem className="text-xs gap-2" onClick={() => setNavView('activity')}>
              <Activity />
              Activity
            </DropdownMenuItem>
          </DropdownMenuGroup>
          {cliNotInstalled && (
            <DropdownMenuGroup>
              <DropdownMenuLabel>Install</DropdownMenuLabel>
              <DropdownMenuItem className="text-xs gap-2 text-primary" onClick={openWizard}>
                <Package />
                Install Orbit CLI…
              </DropdownMenuItem>
            </DropdownMenuGroup>
          )}
          {updatesAvailable && (
            <DropdownMenuGroup>
              <DropdownMenuLabel>Updates</DropdownMenuLabel>
              <DropdownMenuItem className="text-xs gap-2 text-primary" onClick={openSettings}>
                <Download />
                Updates available
              </DropdownMenuItem>
            </DropdownMenuGroup>
          )}
          <DropdownMenuGroup>
            <DropdownMenuLabel>Appearance</DropdownMenuLabel>
            <DropdownMenuItem className="text-xs gap-2" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun /> : <Moon />}
              {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}

