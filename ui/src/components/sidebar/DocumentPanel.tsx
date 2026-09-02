import { useEffect, useRef, useState } from 'react'
import {
  Copy, FolderOpen, Archive, Trash2, Info, Mail, Send,
  FileText, Network, Clipboard, Image, FileCode, GitBranch, Database,
} from 'lucide-react'
import { useAppStore } from '../../store'
import type { AnyFileEntry, DiagramType } from '../../types'
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

function fileScope(file: AnyFileEntry): string {
  return [file.tenant, file.project, file.repository].filter(Boolean).join(' › ')
}

function fileFilename(file: AnyFileEntry): string {
  if (file.kind === 'diagram') return ''
  return file.output_path.split('/').pop() ?? file.output_path
}

function fmtTs(secs: number): string {
  return new Date(secs * 1000).toLocaleString()
}

function diagramTypeIcon(t: DiagramType) {
  if (t === 'sequence') return <GitBranch size={11} />
  if (t === 'er')       return <Database size={11} />
  return <Network size={11} />
}

function kindIcon(file: AnyFileEntry) {
  if (file.kind === 'diagram') return diagramTypeIcon(file.diagram_type)
  if (file.kind === 'image')   return <Image size={11} />
  if (file.kind === 'svg')     return <FileCode size={11} />
  return <FileText size={11} />
}

function kindLabel(file: AnyFileEntry): string {
  if (file.kind === 'diagram') {
    if (file.diagram_type === 'sequence') return 'SEQ'
    if (file.diagram_type === 'er')       return 'ER'
    return 'ARCH'
  }
  if (file.kind === 'svg') return 'SVG'
  return file.format.toUpperCase()
}

function FileItem({
  file,
  isKeySelected,
  onOpen,
  onArchive,
  onDelete,
}: {
  file: AnyFileEntry
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

  const scope    = fileScope(file)
  const filename = fileFilename(file)
  const label    = kindLabel(file)

  async function copyPath() {
    if (file.kind === 'diagram') return
    await navigator.clipboard.writeText(file.output_path)
  }

  async function copyContent() {
    if (file.kind === 'diagram') return
    try {
      const b64 = await tauriService.documentReadB64(file.output_path)
      const text = atob(b64)
      await navigator.clipboard.writeText(text)
    } catch {
      await navigator.clipboard.writeText(file.output_path)
    }
  }

  async function reveal() {
    if (file.kind === 'diagram') return
    if (file.kind === 'image') {
      await tauriService.imageReveal(file.output_path).catch(() => void 0)
    } else if (file.kind === 'svg') {
      await tauriService.svgReveal(file.output_path).catch(() => void 0)
    } else {
      await tauriService.documentReveal(file.output_path).catch(() => void 0)
    }
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
      <Dialog open={showInfo} onOpenChange={setShowInfo}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider font-medium px-1 py-px rounded bg-muted text-muted-foreground">{label}</span>
              {file.title}
            </DialogTitle>
            <DialogDescription className="sr-only">File details</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-xs text-foreground/70">
            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
              <span className="text-foreground/40 font-medium">ID</span>
              <span className="font-mono">{file.id}</span>
              {file.kind !== 'diagram' && (
                <>
                  <span className="text-foreground/40 font-medium">Path</span>
                  <span className="font-mono break-all text-[10px] leading-snug">{file.output_path}</span>
                </>
              )}
              {file.kind === 'diagram' && (
                <>
                  <span className="text-foreground/40 font-medium">Type</span>
                  <span className="capitalize">{file.diagram_type}</span>
                </>
              )}
              {'template' in file && file.template && (
                <>
                  <span className="text-foreground/40 font-medium">Template</span>
                  <span>{file.template}</span>
                </>
              )}
              {scope && (
                <>
                  <span className="text-foreground/40 font-medium">Scope</span>
                  <span>{scope}</span>
                </>
              )}
              {file.workspace && (
                <>
                  <span className="text-foreground/40 font-medium">Workspace</span>
                  <span>{file.workspace}</span>
                </>
              )}
              <span className="text-foreground/40 font-medium">Created</span>
              <span>{fmtTs(file.created_at)}</span>
              <span className="text-foreground/40 font-medium">Updated</span>
              <span>{fmtTs(file.updated_at)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setShowInfo(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDelete} onOpenChange={(o) => { if (!deleting) setShowDelete(o) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Delete file?</DialogTitle>
            <DialogDescription className="text-xs">
              This will permanently delete <span className="font-medium text-foreground">{file.title}</span> and its output file. This cannot be undone.
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
                  <span className="text-[10px] uppercase tracking-wider font-medium px-1 py-px rounded bg-sidebar-foreground/8 text-sidebar-foreground/40 shrink-0 flex items-center gap-0.5">
                    {kindIcon(file)}
                    {label}
                  </span>
                  <span className="text-xs font-medium leading-snug truncate text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground">
                    {file.title}
                  </span>
                </div>
                <span className="text-[10px] leading-tight truncate text-sidebar-foreground/30 pl-0.5">{filename}</span>
                {scope && (
                  <span className="text-[10px] leading-tight truncate text-sidebar-foreground/25 pl-0.5">{scope}</span>
                )}
              </div>
            </button>
          </ContextMenuTrigger>

          <ContextMenuContent className="w-52 text-xs">
            {file.kind !== 'diagram' && (
              <ContextMenuGroup>
                <ContextMenuLabel>Clipboard</ContextMenuLabel>
                <ContextMenuItem className="text-xs gap-2" onClick={copyPath}>
                  <Copy size={13} />Copy path
                </ContextMenuItem>
                <ContextMenuItem className="text-xs gap-2" onClick={copyContent}>
                  <Clipboard size={13} />Copy content
                </ContextMenuItem>
              </ContextMenuGroup>
            )}
            <ContextMenuGroup>
              <ContextMenuLabel>{file.kind === 'diagram' ? 'Diagram' : 'File'}</ContextMenuLabel>
              {file.kind !== 'diagram' && (
                <ContextMenuItem className="text-xs gap-2" onClick={reveal}>
                  <FolderOpen size={13} />Reveal in explorer
                </ContextMenuItem>
              )}
              <ContextMenuItem className="text-xs gap-2" onClick={onArchive}>
                <Archive size={13} />{file.kind === 'diagram' ? 'Remove from history' : 'Archive'}
              </ContextMenuItem>
              {file.kind !== 'diagram' && (
                <ContextMenuItem
                  className="text-xs gap-2 text-destructive focus:text-destructive"
                  onClick={() => setShowDelete(true)}
                >
                  <Trash2 size={13} />Delete…
                </ContextMenuItem>
              )}
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

export function FilesPanel({
  files,
  loading,
  sidebarFocused,
  sidebarSelectedIdx,
  onOpen,
}: {
  files:              AnyFileEntry[]
  loading:            boolean
  sidebarFocused:     boolean
  sidebarSelectedIdx: number
  onOpen: (file: AnyFileEntry) => void
}) {
  const archiveDocument       = useAppStore((s) => s.archiveDocument)
  const deleteDocument        = useAppStore((s) => s.deleteDocument)
  const archiveImage          = useAppStore((s) => s.archiveImage)
  const deleteImage           = useAppStore((s) => s.deleteImage)
  const archiveSvg            = useAppStore((s) => s.archiveSvg)
  const deleteSvg             = useAppStore((s) => s.deleteSvg)
  const removeFromArchHistory = useAppStore((s) => s.removeFromArchHistory)

  function archive(file: AnyFileEntry) {
    if (file.kind === 'diagram') {
      if (file.diagram_type === 'arch' && file.tenant) removeFromArchHistory(file.workspace, file.tenant)
      return
    }
    if (file.kind === 'doc')   return void archiveDocument(file.id, file.workspace)
    if (file.kind === 'image') return void archiveImage(file.id, file.workspace)
    return void archiveSvg(file.id, file.workspace)
  }

  async function remove(file: AnyFileEntry) {
    if (file.kind === 'diagram') return
    if (file.kind === 'doc')   return deleteDocument(file.id, file.workspace)
    if (file.kind === 'image') return deleteImage(file.id, file.workspace)
    return deleteSvg(file.id, file.workspace)
  }

  if (!loading && files.length === 0) {
    return (
      <p className="text-[10px] text-sidebar-foreground/30 px-2 pt-1 italic">No files yet</p>
    )
  }

  return (
    <ul className="p-0 w-full space-y-0.5">
      {files.map((file, idx) => (
        <FileItem
          key={`${file.kind}-${file.id}`}
          file={file}
          isKeySelected={sidebarFocused && idx === sidebarSelectedIdx}
          onOpen={() => onOpen(file)}
          onArchive={() => archive(file)}
          onDelete={() => remove(file)}
        />
      ))}
    </ul>
  )
}

// Keep old export for any remaining direct usage
export { FilesPanel as DocumentsPanel }

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
