import { useEffect, useRef, useState } from 'react'
import {
  Copy, FolderOpen, Archive, Trash2, Info, Mail, Send,
  FileText, Network, Clipboard,
} from 'lucide-react'
import { useAppStore } from '../../store'
import type { DocEntry } from '../../types'
import { tauriService } from '../../services/tauri'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '../ui/context-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { RING_CLASS } from './constants'

function docScope(doc: DocEntry): string {
  return [doc.tenant, doc.project, doc.repository].filter(Boolean).join(' › ')
}

function docFilename(path: string): string {
  return path.split('/').pop() ?? path
}

const TEXT_FORMATS = new Set(['html', 'csv'])

function fmtTs(secs: number): string {
  return new Date(secs * 1000).toLocaleString()
}

function DocumentItem({
  doc,
  isKeySelected,
  onOpen,
  onArchive,
  onDelete,
}: {
  doc: DocEntry
  isKeySelected: boolean
  onOpen: () => void
  onArchive: () => void
  onDelete: () => Promise<void>
}) {
  const itemRef     = useRef<HTMLLIElement>(null)
  const blurSidebar = useAppStore((s) => s.blurSidebar)
  const [showInfo,   setShowInfo]   = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting,   setDeleting]   = useState(false)

  useEffect(() => {
    if (isKeySelected && itemRef.current) {
      itemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [isKeySelected])

  const scope = docScope(doc)
  const file  = docFilename(doc.output_path)

  async function copyPath() {
    await navigator.clipboard.writeText(doc.output_path)
  }

  async function copyContent() {
    if (TEXT_FORMATS.has(doc.format.toLowerCase())) {
      try {
        const b64 = await tauriService.documentReadB64(doc.output_path)
        const text = atob(b64)
        await navigator.clipboard.writeText(text)
        return
      } catch { /* fall through */ }
    }
    await navigator.clipboard.writeText(doc.output_path)
  }

  async function reveal() {
    await tauriService.documentReveal(doc.output_path).catch(() => void 0)
  }

  async function confirmDelete() {
    setDeleting(true)
    try {
      await onDelete()
    } finally {
      setDeleting(false)
      setShowDelete(false)
    }
  }

  return (
    <>
      {/* Info dialog */}
      <Dialog open={showInfo} onOpenChange={setShowInfo}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider font-medium px-1 py-px rounded bg-muted text-muted-foreground">{doc.format}</span>
              {doc.title}
            </DialogTitle>
            <DialogDescription className="sr-only">Document details</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-xs text-foreground/70">
            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
              <span className="text-foreground/40 font-medium">ID</span>
              <span className="font-mono">{doc.id}</span>
              <span className="text-foreground/40 font-medium">Path</span>
              <span className="font-mono break-all text-[10px] leading-snug">{doc.output_path}</span>
              {doc.source_path && (
                <>
                  <span className="text-foreground/40 font-medium">Source</span>
                  <span className="font-mono break-all text-[10px] leading-snug">{doc.source_path}</span>
                </>
              )}
              {doc.template && (
                <>
                  <span className="text-foreground/40 font-medium">Template</span>
                  <span>{doc.template}</span>
                </>
              )}
              {scope && (
                <>
                  <span className="text-foreground/40 font-medium">Scope</span>
                  <span>{scope}</span>
                </>
              )}
              {doc.workspace && (
                <>
                  <span className="text-foreground/40 font-medium">Workspace</span>
                  <span>{doc.workspace}</span>
                </>
              )}
              <span className="text-foreground/40 font-medium">Created</span>
              <span>{fmtTs(doc.created_at)}</span>
              <span className="text-foreground/40 font-medium">Updated</span>
              <span>{fmtTs(doc.updated_at)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setShowInfo(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={showDelete} onOpenChange={(o) => { if (!deleting) setShowDelete(o) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Delete document?</DialogTitle>
            <DialogDescription className="text-xs">
              This will permanently delete <span className="font-medium text-foreground">{doc.title}</span> and its output file. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowDelete(false)} disabled={deleting}>Cancel</Button>
            <Button size="sm" variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <li ref={itemRef}>
        <ContextMenu onOpenChange={(open) => { if (open) blurSidebar() }}>
          <ContextMenuTrigger asChild>
            <button
              onClick={onOpen}
              onContextMenu={(e) => e.stopPropagation()}
              className={`group w-full min-w-0 py-2 px-2 rounded-md transition-colors text-left text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${isKeySelected ? RING_CLASS : ''}`}
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] uppercase tracking-wider font-medium px-1 py-px rounded bg-sidebar-foreground/8 text-sidebar-foreground/40 shrink-0">
                    {doc.format}
                  </span>
                  <span className="text-xs font-medium leading-snug truncate text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground">
                    {doc.title}
                  </span>
                </div>
                <span className="text-[10px] leading-tight truncate text-sidebar-foreground/30 pl-0.5">{file}</span>
                {scope && (
                  <span className="text-[10px] leading-tight truncate text-sidebar-foreground/25 pl-0.5">{scope}</span>
                )}
              </div>
            </button>
          </ContextMenuTrigger>

          <ContextMenuContent className="w-52 text-xs">
            <ContextMenuGroup>
              <ContextMenuLabel>Clipboard</ContextMenuLabel>
              <ContextMenuItem className="text-xs gap-2" onClick={copyPath}>
                <Copy size={13} />Copy path
              </ContextMenuItem>
              <ContextMenuItem className="text-xs gap-2" onClick={copyContent}>
                <Clipboard size={13} />Copy document
              </ContextMenuItem>
            </ContextMenuGroup>
            <ContextMenuGroup>
              <ContextMenuLabel>File</ContextMenuLabel>
              <ContextMenuItem className="text-xs gap-2" onClick={reveal}>
                <FolderOpen size={13} />Reveal in explorer
              </ContextMenuItem>
              <ContextMenuItem className="text-xs gap-2" onClick={onArchive}>
                <Archive size={13} />Archive
              </ContextMenuItem>
              <ContextMenuItem
                className="text-xs gap-2 text-destructive focus:text-destructive"
                onClick={() => setShowDelete(true)}
              >
                <Trash2 size={13} />Delete…
              </ContextMenuItem>
            </ContextMenuGroup>
            <ContextMenuGroup>
              <ContextMenuLabel>More</ContextMenuLabel>
              <ContextMenuItem className="text-xs gap-2" onClick={() => setShowInfo(true)}>
                <Info size={13} />Info
              </ContextMenuItem>
              <ContextMenuSub>
                <ContextMenuSubTrigger className="text-xs gap-2">
                  <Send size={13} />Send to
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-40 text-xs">
                  <ContextMenuItem className="text-xs gap-2 opacity-40 pointer-events-none" disabled>
                    <Mail size={13} />Email
                  </ContextMenuItem>
                  <ContextMenuItem className="text-xs gap-2 opacity-40 pointer-events-none" disabled>
                    <FileText size={13} />Orbit
                  </ContextMenuItem>
                  <ContextMenuItem className="text-xs gap-2 opacity-40 pointer-events-none" disabled>
                    <Network size={13} />Teams
                  </ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>
            </ContextMenuGroup>
          </ContextMenuContent>
        </ContextMenu>
      </li>
    </>
  )
}

export function DocumentsPanel({
  documents,
  loading,
  sidebarFocused,
  sidebarSelectedIdx,
  onOpen,
}: {
  documents:          DocEntry[]
  loading:            boolean
  sidebarFocused:     boolean
  sidebarSelectedIdx: number
  onOpen: (doc: DocEntry) => void
}) {
  const archiveDocument = useAppStore((s) => s.archiveDocument)
  const deleteDocument  = useAppStore((s) => s.deleteDocument)

  if (!loading && documents.length === 0) {
    return (
      <p className="text-[10px] text-sidebar-foreground/30 px-2 pt-1 italic">No documents yet</p>
    )
  }

  return (
    <ul className="p-0 w-full space-y-0.5 pt-0.5">
      {documents.map((doc, idx) => (
        <DocumentItem
          key={doc.id}
          doc={doc}
          isKeySelected={sidebarFocused && idx === sidebarSelectedIdx}
          onOpen={() => onOpen(doc)}
          onArchive={() => void archiveDocument(doc.id, doc.workspace)}
          onDelete={() => deleteDocument(doc.id, doc.workspace)}
        />
      ))}
    </ul>
  )
}

export function DocsPanel() {
  const openUIKit  = useAppStore((s) => s.openUIKit)
  const openColors = useAppStore((s) => s.openColors)
  const openUIMap  = useAppStore((s) => s.openUIMap)
  return (
    <div data-orbit-zone="orbit.desktop.sidebar.panel.docs" className="pt-0.5 space-y-0.5">
      <Button
        variant="ghost"
        onClick={openUIMap}
        className="w-full justify-start h-auto px-2 py-1.5 text-xs text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        UI Map
      </Button>
      <Button
        variant="ghost"
        onClick={openUIKit}
        className="w-full justify-start h-auto px-2 py-1.5 text-xs text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        UI Kit
      </Button>
      <Button
        variant="ghost"
        onClick={openColors}
        className="w-full justify-start h-auto px-2 py-1.5 text-xs text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        Colors
      </Button>
    </div>
  )
}
