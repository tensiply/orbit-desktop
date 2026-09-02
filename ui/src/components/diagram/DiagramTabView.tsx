import type { DiagramEntry } from '../../types'
import { ArchitectureView } from '../ArchitectureView'
import { SequenceDiagramView } from './SequenceDiagramView'
import { ErDiagramView } from './ErDiagramView'

export function DiagramTabView({ entry }: { entry: DiagramEntry }) {
  if (entry.diagram_type === 'arch' && entry.workspace && entry.tenant) {
    return <ArchitectureView workspace={entry.workspace} tenant={entry.tenant} />
  }
  if (entry.diagram_type === 'sequence') {
    return <SequenceDiagramView entry={entry} />
  }
  if (entry.diagram_type === 'er') {
    return <ErDiagramView entry={entry} />
  }
  return null
}
