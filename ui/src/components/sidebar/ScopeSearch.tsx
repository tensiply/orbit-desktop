import { useEffect, useRef } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'

/**
 * ScopeSearch — toggleable search form for the active module's list.
 *
 * Rendered in `panel.content` right after the ScopeNavigator (stacked: header ·
 * scope navigator · search · list), it is a separate component from the scope
 * drill-down. Toggled with Ctrl+F (see `useGlobalShortcuts` →
 * `orbit:toggle-search`); its term filters the module's list. Autofocuses on
 * open, Esc closes.
 *
 * The trailing control is a filter button whose dropdown items are supplied by
 * the module via `filters` (custom nodes). When `filters` is omitted the button
 * is not rendered — a module with no accepted filters shows a plain search box.
 */
export function ScopeSearch({
  value,
  onChange,
  onClose,
  filters,
  filterActive = false,
  placeholder = 'Search…',
}: {
  value: string
  onChange: (v: string) => void
  onClose: () => void
  filters?: React.ReactNode
  filterActive?: boolean
  placeholder?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <div
      data-orbit-zone="orbit.desktop.sidebar.panel.search"
      className="flex items-center gap-1"
    >
      <div className="relative flex-1 min-w-0">
        <Search
          size={11}
          className="absolute left-2 top-1/2 -translate-y-1/2 text-sidebar-foreground/30 pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); onClose() } }}
          placeholder={placeholder}
          className="w-full bg-transparent text-xs text-sidebar-foreground placeholder:text-sidebar-foreground/30 pl-7 pr-2 py-1 rounded-md border border-sidebar-border/50 outline-none focus:border-sidebar-border transition-colors"
        />
      </div>
      {filters && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              title="Filter"
              className={`shrink-0 flex items-center justify-center h-6 w-6 rounded border border-sidebar-border/50 transition-colors ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${filterActive ? 'text-primary' : 'text-sidebar-foreground/40 hover:text-sidebar-foreground/70'}`}
            >
              <SlidersHorizontal size={12} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36 text-xs">
            {filters}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
