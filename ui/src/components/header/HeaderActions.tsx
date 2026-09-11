import { Fragment } from 'react'
import { HeaderActionGroup, HeaderDivider } from './HeaderAction'
import { resolveHeaderActions } from './resolveHeaderActions'
import type { HeaderActionContext, HeaderActionSpec } from './types'

/**
 * Declarative action list for a tab header. Pass specs and the ordering,
 * grouping and vertical dividers are all derived — a new action only needs a
 * spec entry (with optional `order`, `group`, `when`, `flags`, `permissions`).
 */
export function HeaderActions({
  items,
  context,
}: {
  items: HeaderActionSpec[]
  context?: HeaderActionContext
}) {
  const groups = resolveHeaderActions(items, context)
  return (
    <>
      {groups.map((group, i) => (
        <Fragment key={group.key}>
          {i > 0 && <HeaderDivider />}
          <HeaderActionGroup>
            {group.items.map((item) => (
              <Fragment key={item.id}>{item.node}</Fragment>
            ))}
          </HeaderActionGroup>
        </Fragment>
      ))}
    </>
  )
}
