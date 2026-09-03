// Typed application event bus for orbit domain events.
//
// Independent of React and the DOM so any code — hooks, store slices, and future
// non-React automation flows — can publish and subscribe. This is the foundation
// for notifications, automated workflows, etc. Add new events to OrbitEventMap.
import type { SessionStatus } from '../types'

export interface OrbitEventMap {
  'session:status-changed': {
    sessionId: string
    from: SessionStatus | undefined
    to: SessionStatus
    at: number
  }
}

export type OrbitEventType = keyof OrbitEventMap
type Handler<K extends OrbitEventType> = (payload: OrbitEventMap[K]) => void

const handlers = new Map<OrbitEventType, Set<Handler<OrbitEventType>>>()

/** Subscribe to an event. Returns an unsubscribe function. */
export function on<K extends OrbitEventType>(type: K, handler: Handler<K>): () => void {
  let set = handlers.get(type)
  if (!set) {
    set = new Set()
    handlers.set(type, set)
  }
  set.add(handler as Handler<OrbitEventType>)
  return () => {
    set!.delete(handler as Handler<OrbitEventType>)
  }
}

/** Subscribe to the next occurrence of an event, then auto-unsubscribe. */
export function once<K extends OrbitEventType>(type: K, handler: Handler<K>): () => void {
  const off = on(type, (payload) => {
    off()
    handler(payload)
  })
  return off
}

/** Publish an event. Handler errors are isolated so one bad subscriber can't break the rest. */
export function emit<K extends OrbitEventType>(type: K, payload: OrbitEventMap[K]): void {
  const set = handlers.get(type)
  if (!set) return
  for (const handler of set) {
    try {
      handler(payload)
    } catch (err) {
      console.error(`[orbit] event handler for "${type}" threw`, err)
    }
  }
}

export const eventBus = { on, once, emit }
