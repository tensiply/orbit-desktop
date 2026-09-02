/**
 * SidebarPanel — the shared shell for every rail module's panel.
 *
 * Mental model:
 *   - Each rail button (NAV_ITEMS / BOTTOM_NAV_ITEMS in Rail.tsx) is a **module**.
 *   - Selecting a module opens its **panel** here in the sidebar, listing that
 *     module's **submodules** (sessions, files, tasks, docs sections, …).
 *   - Opening a submodule renders it in the `orbit.desktop.principal` column.
 *
 * Every module panel MUST render through this component so the header
 * (`orbit.desktop.sidebar.panel.header`) and the scrollable content
 * (`orbit.desktop.sidebar.panel.content`) stay structurally identical.
 *
 * The panel stacks vertically: header (title · actions · scope toggle), then the
 * content, which itself stacks the scope navigator, the search box and the list.
 *
 * `actions` — module-specific header controls (loading spinners, etc.).
 * `filters` — scope toggle (`orbit.desktop.sidebar.panel.filters`), in the header.
 */
export function SidebarPanel({
  label,
  actions,
  filters,
  children,
}: {
  label: string
  actions?: React.ReactNode
  filters?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div data-orbit-zone="orbit.desktop.sidebar.panel" className="flex flex-col flex-1 min-h-0 min-w-0 gap-4">
      <div
        data-orbit-zone="orbit.desktop.sidebar.panel.header"
        className="flex items-center pt-3 pl-3 pr-2 shrink-0 gap-4"
      >
        <span className="text-[10px] font-medium text-sidebar-foreground/40 uppercase tracking-wider flex-1 min-w-0 truncate">
          {label}
        </span>
        {actions}
        {filters && (
          <div
            data-orbit-zone="orbit.desktop.sidebar.panel.filters"
            className="flex items-center gap-1 shrink-0"
          >
            {filters}
          </div>
        )}
      </div>

      <div
        data-orbit-zone="orbit.desktop.sidebar.panel.content"
        className="flex flex-col gap-4 flex-1 overflow-y-auto overflow-x-hidden min-h-0 pl-3 pr-2 no-scrollbar"
      >
        {children}
      </div>
    </div>
  )
}
