import type { HeaderActionContext, HeaderActionSpec, ResolvedHeaderGroup } from './types'

function isVisible(spec: HeaderActionSpec, ctx: HeaderActionContext): boolean {
  if (spec.when === false) return false
  if (spec.flags?.some((flag) => !ctx.flags?.includes(flag))) return false
  if (spec.permissions?.some((perm) => !ctx.permissions?.includes(perm))) return false
  return true
}

/**
 * Filters actions by visibility / flags / permissions, then sorts and clusters
 * them into ordered groups. Pure: the renderer only maps the result to DOM, so
 * dividers land exactly between visible groups regardless of what got dropped.
 */
export function resolveHeaderActions(
  specs: HeaderActionSpec[],
  ctx: HeaderActionContext = {},
): ResolvedHeaderGroup[] {
  const visible = specs
    .map((spec, index) => ({ spec, index, order: spec.order ?? index }))
    .filter(({ spec }) => isVisible(spec, ctx))

  const groups = new Map<
    string,
    { items: typeof visible; order: number; firstIndex: number }
  >()
  for (const entry of visible) {
    const key = entry.spec.group ?? entry.spec.id
    const group = groups.get(key)
    if (group) {
      group.items.push(entry)
      group.order = Math.min(group.order, entry.order)
      group.firstIndex = Math.min(group.firstIndex, entry.index)
    } else {
      groups.set(key, { items: [entry], order: entry.order, firstIndex: entry.index })
    }
  }

  return [...groups.entries()]
    .sort(([, a], [, b]) => a.order - b.order || a.firstIndex - b.firstIndex)
    .map(([key, group]) => ({
      key,
      items: group.items
        .sort((a, b) => a.order - b.order || a.index - b.index)
        .map((entry) => entry.spec),
    }))
}
