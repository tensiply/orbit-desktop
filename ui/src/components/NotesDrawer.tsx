import { Drawer } from './ui/drawer'
import { useAppStore } from '../store'
import { NotesView } from './NotesView'

export function NotesDrawer() {
  const open  = useAppStore((s) => s.notesDrawerOpen)
  const scope = useAppStore((s) => s.notesDrawerScope)
  const close = useAppStore((s) => s.closeNotesDrawer)

  return (
    <Drawer
      open={open}
      onClose={close}
      title="Notes"
      zone="orbit.desktop.drawer.notes"
      className="bg-card ring-4 ring-sidebar"
      width={360}
    >
      {scope && <NotesView scope={scope} />}
    </Drawer>
  )
}
