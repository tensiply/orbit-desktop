import type { ReactNode } from 'react'

/**
 * Gating context resolved once per header render. Extend with whatever the app
 * knows about the current session (enabled feature flags, granted permissions,
 * …); `resolveHeaderActions` matches action specs against it.
 */
export interface HeaderActionContext {
  flags?: string[]
  permissions?: string[]
}

/**
 * Declarative description of a single header control. Adding a new action is a
 * matter of appending one of these — ordering, grouping and dividers are all
 * derived, never hand-placed.
 */
export interface HeaderActionSpec {
  /** Stable identity; also the fallback group key. */
  id: string
  /** Sort key across all actions. Lower renders further left. Defaults to insertion order. */
  order?: number
  /** Actions sharing a group render together with no divider between them. */
  group?: string
  /** Explicit visibility. `false` removes the action entirely. Defaults to visible. */
  when?: boolean
  /** Feature flags that must all be present in the context for the action to show. */
  flags?: string[]
  /** Permissions that must all be present in the context for the action to show. */
  permissions?: string[]
  /** The rendered control (a `HeaderAction`, badge, select group, …). */
  node: ReactNode
}

/** A cluster of visible actions that render together, separated from siblings by a divider. */
export interface ResolvedHeaderGroup {
  key: string
  items: HeaderActionSpec[]
}
