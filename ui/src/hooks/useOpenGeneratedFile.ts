import { useEffect } from "react"
import { listen } from "@tauri-apps/api/event"
import { useAppStore } from "../store"

interface OpenFilePayload {
  kind: "doc" | "image" | "svg"
  id: string
  /** Workspace that owns the entry. May be absent from older CLIs. */
  workspace?: string
}

/** How many times to refetch + look up before giving up on a just-generated entry. */
const MAX_ATTEMPTS = 3
/** Delay between attempts; covers the brief window where the index write isn't visible yet. */
const RETRY_DELAY_MS = 150

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/**
 * Entry IDs are allocated per workspace, so the same `DOC-000004` can exist in several.
 * Match on workspace too when the event carries one; fall back to ID alone for older CLIs.
 */
const matches = <T extends { id: string; workspace: string }>(
  entry: T,
  id: string,
  workspace?: string,
): boolean => entry.id === id && (!workspace || entry.workspace === workspace)

/**
 * Open a freshly generated file in a tab.
 *
 * The desktop MCP server emits `desktop:open-file` when `orbit document|image|svg create`
 * finishes inside a session. The entry was just written to the index, but a refetch can race
 * the write or hit a transient error, so we retry a few times before giving up. A silent miss
 * here is why a generated file occasionally failed to surface — hence the bounded retry + warn.
 */
export function useOpenGeneratedFile() {
  useEffect(() => {
    const unlisten = listen<OpenFilePayload>("desktop:open-file", async ({ payload }) => {
      const { kind, id, workspace } = payload

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const store = useAppStore.getState()
        if (kind === "doc") {
          await store.fetchDocuments()
          const doc = useAppStore.getState().documents.find((d) => matches(d, id, workspace))
          if (doc) return void useAppStore.getState().openDocument(doc)
        } else if (kind === "image") {
          await store.fetchImages()
          const img = useAppStore.getState().images.find((i) => matches(i, id, workspace))
          if (img) return void useAppStore.getState().openImage(img)
        } else if (kind === "svg") {
          await store.fetchSvgs()
          const svg = useAppStore.getState().svgs.find((s) => matches(s, id, workspace))
          if (svg) return void useAppStore.getState().openSvg(svg)
        }
        if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS)
      }

      console.warn(
        `[open-file] ${kind} ${id}${workspace ? ` (${workspace})` : ""} not found after ${MAX_ATTEMPTS} attempts`,
      )
    })
    return () => {
      void unlisten.then((fn) => fn())
    }
  }, [])
}
