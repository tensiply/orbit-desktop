import { useAppStore } from '../store'
import type { Session } from '../types'
import {
  ClaudeEngineIcon,
  GeminiEngineIcon,
  OpenCodeEngineIcon,
  DefaultEngineIcon,
} from '../icons'
import { MakeRunner } from './MakeRunner'
import { PipelineBadge } from './PipelineBadge'
import { TabHeader, HeaderActions } from './header'
import type { HeaderActionSpec } from './header'
import { useMakefileTargets } from '../hooks/useMakefileTargets'
import { usePipelines } from '../hooks/usePipelines'

function workspaceFromWorkDir(workDir: string): string | null {
  const parts = workDir.split('/').filter(Boolean)
  return parts.length >= 3 && parts[0] === 'home' ? parts[2] : null
}

function fullScopeParts(session: Session): string[] {
  const parts: string[] = []
  const ws = workspaceFromWorkDir(session.work_dir)
  if (ws)                   parts.push(ws)
  if (session.tenant)       parts.push(session.tenant)
  if (session.project)      parts.push(session.project)
  if (session.repository)   parts.push(session.repository)
  return parts
}

function EngineIcon({ engine, size = 11 }: { engine: string; size?: number }) {
  switch (engine) {
    case 'claude':   return <ClaudeEngineIcon size={size} />
    case 'gemini':   return <GeminiEngineIcon size={size} />
    case 'opencode': return <OpenCodeEngineIcon size={size} />
    default:         return <DefaultEngineIcon size={size} />
  }
}

export function SessionHeader() {
  const tabs        = useAppStore((s) => s.tabs)
  const activeTabId = useAppStore((s) => s.activeTabId)
  const sessions    = useAppStore((s) => s.sessions)

  const activeTab = tabs.find((t) => t.id === activeTabId)
  if (!activeTab || activeTab.type !== 'terminal' || !activeTab.sessionId) return null

  const session = sessions.find((s) => s.id === activeTab.sessionId)
  if (!session) return null

  const engine = session.engine.toLowerCase()
  const parts  = fullScopeParts(session)

  return (
    <TabHeader
      icon={<EngineIcon engine={engine} size={11} />}
      parts={parts}
      globalMode={session.global_mode}
      actions={<SessionActions session={session} tabId={activeTab.id} />}
    />
  )
}

function SessionActions({ session, tabId }: { session: Session; tabId: string }) {
  const makeTargets        = useMakefileTargets(session.work_dir)
  const pipelines          = usePipelines(session)
  const openPipelineDrawer = useAppStore((s) => s.openPipelineDrawer)

  const items: HeaderActionSpec[] = [
    {
      id: 'pipelines',
      order: 10,
      when: pipelines.length > 0,
      node: <PipelineBadge pipelines={pipelines} onClick={openPipelineDrawer} />,
    },
    {
      id: 'make',
      order: 20,
      when: makeTargets.length > 0,
      node: <MakeRunner session={session} tabId={tabId} targets={makeTargets} />,
    },
  ]

  return <HeaderActions items={items} />
}
