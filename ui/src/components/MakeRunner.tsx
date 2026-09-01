import { useEffect, useState } from 'react'
import { Play } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { Button } from './ui/button'
import { tauriService } from '../services/tauri'
import type { Session } from '../types'

const STORAGE_PREFIX = 'orbit-make-target:'

function storageKey(workDir: string) {
  return `${STORAGE_PREFIX}${workDir}`
}

interface Props {
  session: Session
  tabId: string
}

export function MakeRunner({ session, tabId }: Props) {
  const [targets, setTargets] = useState<string[]>([])
  const [selected, setSelected] = useState<string>('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setTargets([])
    setSelected('')

    tauriService.makefileTargets(session.work_dir).then((ts) => {
      setTargets(ts)
      if (ts.length > 0) {
        const saved = localStorage.getItem(storageKey(session.work_dir))
        setSelected(saved && ts.includes(saved) ? saved : ts[0])
      }
    })
  }, [session.work_dir])

  useEffect(() => {
    const onOpen = () => setOpen(true)
    const onRun = () => { void run() }
    window.addEventListener('orbit:make-open', onOpen)
    window.addEventListener('orbit:make-run', onRun)
    return () => {
      window.removeEventListener('orbit:make-open', onOpen)
      window.removeEventListener('orbit:make-run', onRun)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, tabId])

  const handleSelect = (value: string) => {
    setSelected(value)
    localStorage.setItem(storageKey(session.work_dir), value)
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
  }

  async function run() {
    if (!selected || !tabId) return
    await tauriService.ptyWrite(tabId, `make ${selected}\n`)
  }

  if (targets.length === 0) return null

  return (
    <div className="flex items-center gap-1 shrink-0">
      <Select open={open} onOpenChange={handleOpenChange} value={selected} onValueChange={handleSelect}>
        <SelectTrigger
          className="h-5 gap-1 rounded border-0 bg-transparent px-1.5 py-0 text-[10px] font-medium text-foreground/40 shadow-none ring-0 focus:ring-0 hover:bg-muted/50 hover:text-foreground/70 [&>span]:max-w-[120px] [&>span]:truncate data-[placeholder]:text-foreground/25"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="text-xs">
          {targets.map((t) => (
            <SelectItem key={t} value={t} className="text-xs py-1">
              {t}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => { void run() }}
        title="Run make target (Ctrl+P)"
        className="h-5 w-5 text-foreground/35 hover:text-foreground/70"
      >
        <Play className="h-2.5 w-2.5 fill-current" />
      </Button>
    </div>
  )
}
