import { useEffect } from "react"
import { listen } from "@tauri-apps/api/event"
import { useAppStore } from "../store"

interface OpenFilePayload {
  kind: "doc" | "image" | "svg"
  id: string
}

/**
 * Open a freshly generated file in a tab.
 *
 * The desktop MCP server emits `desktop:open-file` when `orbit document|image|svg create`
 * finishes inside a session. The entry was just written to the index, so our cached list is
 * likely stale — refetch the relevant kind, then open the entry by ID.
 */
export function useOpenGeneratedFile() {
  useEffect(() => {
    const unlisten = listen<OpenFilePayload>("desktop:open-file", async ({ payload }) => {
      const { kind, id } = payload
      const store = useAppStore.getState()
      if (kind === "doc") {
        await store.fetchDocuments()
        const doc = useAppStore.getState().documents.find((d) => d.id === id)
        if (doc) useAppStore.getState().openDocument(doc)
      } else if (kind === "image") {
        await store.fetchImages()
        const img = useAppStore.getState().images.find((i) => i.id === id)
        if (img) useAppStore.getState().openImage(img)
      } else if (kind === "svg") {
        await store.fetchSvgs()
        const svg = useAppStore.getState().svgs.find((s) => s.id === id)
        if (svg) useAppStore.getState().openSvg(svg)
      }
    })
    return () => {
      void unlisten.then((fn) => fn())
    }
  }, [])
}
