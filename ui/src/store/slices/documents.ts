import type { StateCreator } from 'zustand'
import { invoke } from '@tauri-apps/api/core'
import type { AppStore } from '../types'
import type { DocEntry, ImageEntry, SvgEntry, AnyFileEntry } from '../../types'
import { tauriService } from '../../services/tauri'

export interface DocumentsSlice {
  documents:        DocEntry[]
  documentsLoading: boolean
  images:           ImageEntry[]
  imagesLoading:    boolean
  svgs:             SvgEntry[]
  svgsLoading:      boolean

  fetchDocuments: () => Promise<void>
  fetchImages:    () => Promise<void>
  fetchSvgs:      () => Promise<void>
  fetchFiles:     () => Promise<void>

  openDocument:   (doc: DocEntry) => void
  openImage:      (img: ImageEntry) => void
  openSvg:        (svg: SvgEntry) => void

  deleteDocument: (id: string, workspace: string) => Promise<void>
  archiveDocument:(id: string, workspace: string) => Promise<void>
  deleteImage:    (id: string, workspace: string) => Promise<void>
  archiveImage:   (id: string, workspace: string) => Promise<void>
  deleteSvg:      (id: string, workspace: string) => Promise<void>
  archiveSvg:     (id: string, workspace: string) => Promise<void>
}

export function mergeFiles(
  documents: DocEntry[],
  images: ImageEntry[],
  svgs: SvgEntry[],
): AnyFileEntry[] {
  const all: AnyFileEntry[] = [
    ...documents.map((d) => ({ kind: 'doc' as const,   ...d })),
    ...images.map((i)   => ({ kind: 'image' as const,  ...i })),
    ...svgs.map((s)     => ({ kind: 'svg' as const, format: 'svg' as const, ...s })),
  ]
  all.sort((a, b) => b.updated_at - a.updated_at)
  return all
}

function closeTab(tabId: string, state: AppStore): Partial<AppStore> {
  const tabs = state.tabs.filter((t) => t.id !== tabId)
  const activeTabId = state.activeTabId === tabId
    ? (tabs.find((t) => t.id !== tabId)?.id ?? null)
    : state.activeTabId
  return { tabs, activeTabId }
}

export const createDocumentsSlice: StateCreator<AppStore, [], [], DocumentsSlice> = (set, get) => ({
  documents:        [],
  documentsLoading: false,
  images:           [],
  imagesLoading:    false,
  svgs:             [],
  svgsLoading:      false,

  fetchDocuments: async () => {
    set({ documentsLoading: true })
    try {
      const docs = await invoke<DocEntry[]>('document_list')
      set({ documents: docs, documentsLoading: false })
    } catch {
      set({ documentsLoading: false })
    }
  },

  fetchImages: async () => {
    set({ imagesLoading: true })
    try {
      const imgs = await tauriService.imageList()
      set({ images: imgs, imagesLoading: false })
    } catch {
      set({ imagesLoading: false })
    }
  },

  fetchSvgs: async () => {
    set({ svgsLoading: true })
    try {
      const svgs = await tauriService.svgList()
      set({ svgs, svgsLoading: false })
    } catch {
      set({ svgsLoading: false })
    }
  },

  fetchFiles: async () => {
    const s = get()
    await Promise.all([
      s.fetchDocuments(),
      s.fetchImages(),
      s.fetchSvgs(),
    ])
  },

  openDocument: (doc: DocEntry) => {
    const tabId = `doc-${doc.id}`
    const existing = get().tabs.find((t) => t.id === tabId)
    if (existing) {
      set({ activeTabId: tabId })
      return
    }
    const tab = { id: tabId, title: doc.title, type: 'document' as const, docId: doc.id }
    set((s) => ({ tabs: [...s.tabs, tab], activeTabId: tabId }))
  },

  openImage: (img: ImageEntry) => {
    const tabId = `img-${img.id}`
    const existing = get().tabs.find((t) => t.id === tabId)
    if (existing) {
      set({ activeTabId: tabId })
      return
    }
    const tab = {
      id: tabId,
      title: img.title,
      type: 'file' as const,
      filePath: img.output_path,
      fileFormat: img.format,
    }
    set((s) => ({ tabs: [...s.tabs, tab], activeTabId: tabId }))
  },

  openSvg: (svg: SvgEntry) => {
    const tabId = `svg-${svg.id}`
    const existing = get().tabs.find((t) => t.id === tabId)
    if (existing) {
      set({ activeTabId: tabId })
      return
    }
    const tab = {
      id: tabId,
      title: svg.title,
      type: 'file' as const,
      filePath: svg.output_path,
      fileFormat: 'svg',
    }
    set((s) => ({ tabs: [...s.tabs, tab], activeTabId: tabId }))
  },

  deleteDocument: async (id: string, workspace: string) => {
    await invoke('document_delete', { id, workspace })
    set((s) => ({ documents: s.documents.filter((d) => d.id !== id) }))
    const tabId = `doc-${id}`
    set((s) => closeTab(tabId, s as AppStore))
  },

  archiveDocument: async (id: string, workspace: string) => {
    await invoke('document_archive', { id, workspace })
    set((s) => ({ documents: s.documents.filter((d) => d.id !== id) }))
    const tabId = `doc-${id}`
    set((s) => closeTab(tabId, s as AppStore))
  },

  deleteImage: async (id: string, workspace: string) => {
    await tauriService.imageDelete(id, workspace)
    set((s) => ({ images: s.images.filter((i) => i.id !== id) }))
    const tabId = `img-${id}`
    set((s) => closeTab(tabId, s as AppStore))
  },

  archiveImage: async (id: string, workspace: string) => {
    await tauriService.imageArchive(id, workspace)
    set((s) => ({ images: s.images.filter((i) => i.id !== id) }))
    const tabId = `img-${id}`
    set((s) => closeTab(tabId, s as AppStore))
  },

  deleteSvg: async (id: string, workspace: string) => {
    await tauriService.svgDelete(id, workspace)
    set((s) => ({ svgs: s.svgs.filter((sv) => sv.id !== id) }))
    const tabId = `svg-${id}`
    set((s) => closeTab(tabId, s as AppStore))
  },

  archiveSvg: async (id: string, workspace: string) => {
    await tauriService.svgArchive(id, workspace)
    set((s) => ({ svgs: s.svgs.filter((sv) => sv.id !== id) }))
    const tabId = `svg-${id}`
    set((s) => closeTab(tabId, s as AppStore))
  },
})
