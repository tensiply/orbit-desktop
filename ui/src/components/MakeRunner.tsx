import { useEffect, useState } from 'react'
import { Play, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { Button } from './ui/button'
import { HeaderAction, headerActionIconClass } from './header'
import { useAppStore } from '../store'
import type { Session } from '../types'

const STORAGE_PREFIX = 'orbit-make-target:'

function storageKey(workDir: string) {
  return `${STORAGE_PREFIX}${workDir}`
}

interface Props {
  session: Session
  targets: string[]
}

export function MakeRunner({ session, targets }: Props) {
  const [selected, setSelected] = useState<string>('')
  const [open, setOpen] = useState(false)
  const runInExecutionDrawer = useAppStore((s) => s.runInExecutionDrawer)

  useEffect(() => {
    if (targets.length === 0) {
      setSelected('')
      return
    }
    const saved = localStorage.getItem(storageKey(session.work_dir))
    setSelected(saved && targets.includes(saved) ? saved : targets[0])
  }, [targets, session.work_dir])

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
  }, [selected])

  const handleSelect = (value: string) => {
    setSelected(value)
    localStorage.setItem(storageKey(session.work_dir), value)
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
  }

  async function run() {
    if (!selected) return
    await runInExecutionDrawer(session.work_dir, `make ${selected}`)
  }

  if (targets.length === 0) return null

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {/* Run */}
      <HeaderAction
        icon={<Play />}
        label="Run make target (Ctrl+P)"
        onClick={() => { void run() }}
      />

      {/* Selected target — label */}
      <span
        title={selected}
        className="text-[10px] font-medium text-foreground/50 max-w-[140px] truncate select-none"
      >
        {selected}
      </span>

      {/* Open target selector — same ghost button as Play */}
      <DropdownMenu open={open} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" aria-label="Choose make target" title="Choose make target" className={headerActionIconClass}>
            <ChevronDown />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[8rem]">
          <DropdownMenuRadioGroup value={selected} onValueChange={handleSelect}>
            {targets.map((t) => (
              <DropdownMenuRadioItem key={t} value={t} className="text-xs">
                {t}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
