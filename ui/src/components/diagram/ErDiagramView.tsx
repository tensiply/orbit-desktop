import { useCallback, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  BackgroundVariant,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Plus, Save } from 'lucide-react'
import type { DiagramEntry } from '../../types'
import { Button } from '../ui/button'

const storageKey = (id: string) => `orbit-diagram-er-${id}`

function load(id: string): { nodes: Node[]; edges: Edge[] } {
  try {
    const raw = localStorage.getItem(storageKey(id))
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { nodes: [], edges: [] }
}

function save(id: string, nodes: Node[], edges: Edge[]) {
  localStorage.setItem(storageKey(id), JSON.stringify({ nodes, edges }))
}

export function ErDiagramView({ entry }: { entry: DiagramEntry }) {
  const initial = load(entry.id)
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges)
  const [dirty, setDirty] = useState(false)

  const onConnect = useCallback((conn: Connection) => {
    setEdges((eds) => addEdge({ ...conn, animated: false }, eds))
    setDirty(true)
  }, [setEdges])

  function addEntity() {
    const id = `entity-${Date.now()}`
    const node: Node = {
      id,
      type: 'default',
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
      data: { label: 'Entity' },
      style: {
        background: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))',
        borderRadius: 6,
        fontSize: 12,
        color: 'hsl(var(--foreground))',
        padding: '8px 16px',
        minWidth: 100,
        textAlign: 'center',
      },
    }
    setNodes((ns) => [...ns, node])
    setDirty(true)
  }

  function handleSave() {
    save(entry.id, nodes, edges)
    setDirty(false)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border/40 shrink-0">
        <span className="text-xs font-medium text-foreground/60 flex-1 truncate">{entry.title}</span>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={addEntity}>
          <Plus size={12} className="mr-1" />Add entity
        </Button>
        <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={!dirty}>
          <Save size={12} className="mr-1" />Save
        </Button>
      </div>
      <div className="flex-1 min-h-0">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={(changes) => { onNodesChange(changes); setDirty(true) }}
          onEdgesChange={(changes) => { onEdgesChange(changes); setDirty(true) }}
          onConnect={onConnect}
          fitView
          deleteKeyCode="Delete"
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} className="opacity-30" />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </div>
  )
}
