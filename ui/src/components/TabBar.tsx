import { SquareTerminal, Settings, Keyboard, Layers, FileText, Network, Waypoints, Map, ListChecks, X } from 'lucide-react'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { restrictToHorizontalAxis, restrictToParentElement } from '@dnd-kit/modifiers'
import { CSS } from '@dnd-kit/utilities'
import type { CSSProperties, HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { useAppStore } from '../store'
import type { Tab } from '../store'
import { tabMatchesWorkspace } from '../domain/scope'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
import { Button } from './ui/button'

function tabIcon(type: Tab['type']) {
  switch (type) {
    case 'settings':     return Settings
    case 'shortcuts':    return Keyboard
    case 'uikit':        return Layers
    case 'document':     return FileText
    case 'diagram':      return Waypoints
    case 'ui-map':       return Map
    case 'task':         return ListChecks
    case 'feature-page': return ListChecks
    default:             return SquareTerminal
  }
}

export function TabBar() {
  const tabs              = useAppStore((s) => s.tabs)
  const activeTabId       = useAppStore((s) => s.activeTabId)
  const navView           = useAppStore((s) => s.navView)
  const selectedWorkspace = useAppStore((s) => s.selectedWorkspace)
  const setActiveTab      = useAppStore((s) => s.setActiveTab)
  const closeTab          = useAppStore((s) => s.closeTab)
  const reorderTabs       = useAppStore((s) => s.reorderTabs)

  const featureTab  = tabs.find((t) => t.type === 'feature-page' && t.featureView === navView)
  const regularTabs = tabs
    .filter((t) => t.type !== 'feature-page' && !(t.type === 'task' && navView !== 'tasks'))
    .filter((t) => tabMatchesWorkspace(t, selectedWorkspace))
  const showFeature = !!featureTab

  // A small activation distance keeps plain clicks (activate / close) working —
  // a drag only begins once the pointer moves past the threshold.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (over && active.id !== over.id) reorderTabs(String(active.id), String(over.id))
  }

  return (
    <div data-orbit-zone="orbit.desktop.principal.card.tabs" className="flex shrink-0 select-none bg-card h-[36px] border-b border-sidebar-border/60">
      {/* Scrollable, drag-sortable tab list */}
      <div
        role="tablist"
        className="flex items-stretch flex-1 min-w-0 overflow-x-auto no-scrollbar"
      >
        {regularTabs.length === 0 && !showFeature && (
          <span className="flex items-end pb-2 px-3 text-xs text-foreground/20 pointer-events-none">
            No tabs open
          </span>
        )}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToHorizontalAxis, restrictToParentElement]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={regularTabs.map((t) => t.id)} strategy={horizontalListSortingStrategy}>
            {regularTabs.map((tab) => (
              <SortableTabItem
                key={tab.id}
                tab={tab}
                active={tab.id === activeTabId}
                onActivate={() => setActiveTab(tab.id)}
                onClose={() => closeTab(tab.id)}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      {/* Feature page tab — pinned right, no close button, visible only for the active nav view */}
      {showFeature && (
        <div className="flex items-stretch shrink-0 border-l border-sidebar-border/40">
          <TabItem
            tab={featureTab}
            active={featureTab.id === activeTabId}
            onActivate={() => setActiveTab(featureTab.id)}
            pinned
          />
        </div>
      )}
    </div>
  )
}

function SortableTabItem(props: {
  tab:        Tab
  active:     boolean
  onActivate: () => void
  onClose:    () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.tab.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
    zIndex:  isDragging ? 10 : undefined,
  }
  return (
    <TabItem
      {...props}
      dragRef={setNodeRef}
      dragStyle={style}
      dragHandleProps={{ ...attributes, ...listeners }}
    />
  )
}

function TabItem({
  tab,
  active,
  onActivate,
  onClose,
  pinned = false,
  dragRef,
  dragStyle,
  dragHandleProps,
}: {
  tab:              Tab
  active:           boolean
  onActivate:       () => void
  onClose?:         () => void
  pinned?:          boolean
  dragRef?:         (node: HTMLElement | null) => void
  dragStyle?:       CSSProperties
  dragHandleProps?: HTMLAttributes<HTMLElement>
}) {
  const Icon = tabIcon(tab.type)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          ref={dragRef}
          style={dragStyle}
          {...dragHandleProps}
          role="tab"
          aria-selected={active}
          onClick={onActivate}
          className={cn(
            'group flex items-center gap-1.5 px-3 text-xs cursor-pointer shrink-0 transition-colors border-b-2 relative',
            active
              ? 'bg-card text-foreground border-b-tab-indicator'
              : 'text-foreground/38 border-b-transparent hover:bg-sidebar-accent/40 hover:text-foreground/58',
          )}
        >
          <Icon
            size={12}
            className={cn(
              'shrink-0 transition-colors',
              active ? 'text-foreground/55' : 'text-foreground/22 group-hover:text-foreground/40',
            )}
          />
          <span className="max-w-[108px] truncate leading-none">{tab.title}</span>

          {!pinned && onClose && (
            <Button
              variant="ghost"
              className={cn(
                'size-4 p-0 rounded shrink-0 transition-all',
                active
                  ? 'text-foreground/30 hover:text-destructive hover:bg-destructive/10'
                  : 'text-transparent group-hover:text-foreground/28 hover:!text-destructive hover:!bg-destructive/10',
              )}
              onClick={(e) => {
                e.stopPropagation()
                onClose()
              }}
              title="Close"
            >
              <X size={10} />
            </Button>
          )}

          {/* Separator — right edge, hidden for active and its right neighbour */}
          {!active && !pinned && (
            <span className="absolute right-0 top-1/4 h-1/2 w-px bg-border/40 pointer-events-none" />
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-[11px]">
        {tab.title}
      </TooltipContent>
    </Tooltip>
  )
}
