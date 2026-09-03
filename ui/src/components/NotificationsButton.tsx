import { useState } from 'react'
import { Bell, Trash2 } from 'lucide-react'
import { useAppStore } from '../store'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import type { NotificationLevel } from '../store/slices/notifications'
import { cn } from '@/lib/utils'

// Dot color per level — mirrors the toast severity so history reads at a glance.
const LEVEL_DOT: Record<NotificationLevel, string> = {
  success: 'bg-emerald-500',
  error:   'bg-destructive',
  warning: 'bg-amber-500',
  info:    'bg-sky-500',
  message: 'bg-foreground/30',
}

function timeAgo(at: number): string {
  const s = Math.max(0, Math.floor((Date.now() - at) / 1000))
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export function NotificationsButton() {
  const notifications = useAppStore((s) => s.notifications)
  const markRead      = useAppStore((s) => s.markNotificationsRead)
  const clearAll      = useAppStore((s) => s.clearNotifications)
  const blurSidebar   = useAppStore((s) => s.blurSidebar)
  const [open, setOpen] = useState(false)

  const unread = notifications.reduce((n, x) => n + (x.read ? 0 : 1), 0)

  const handleOpenChange = (o: boolean) => {
    if (o) {
      blurSidebar()
      markRead()
    }
    setOpen(o)
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          tabIndex={-1}
          onFocus={(e) => e.currentTarget.blur()}
          title="Notifications"
          className="relative ml-2 h-6 w-6 text-foreground/50 hover:text-foreground/80 hover:bg-foreground/8 border border-foreground/12 hover:border-foreground/20 [&_svg]:size-[11px] data-[state=open]:bg-foreground/8 data-[state=open]:text-foreground/80 data-[state=open]:border-foreground/20"
        >
          <Bell />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-3 h-3 px-0.5 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[8px] leading-none font-medium">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-xs font-medium text-foreground/80">Notifications</span>
          {notifications.length > 0 && (
            <button
              onClick={() => clearAll()}
              className="flex items-center gap-1 text-[10px] text-foreground/40 hover:text-foreground/80 transition-colors"
            >
              <Trash2 size={11} /> Clear
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto no-scrollbar">
          {notifications.length === 0 ? (
            <div className="px-3 py-8 text-center text-[11px] text-foreground/35">
              No notifications yet
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className="flex gap-2 px-3 py-2 border-b border-border/50 last:border-0"
              >
                <span className={cn('mt-1 w-1.5 h-1.5 rounded-full shrink-0', LEVEL_DOT[n.level])} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[11px] font-medium text-foreground/85 truncate">{n.title}</span>
                    <span className="ml-auto text-[10px] text-foreground/30 shrink-0">{timeAgo(n.at)}</span>
                  </div>
                  {n.description && (
                    <p className="text-[10px] text-foreground/45 mt-0.5 line-clamp-2">{n.description}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
