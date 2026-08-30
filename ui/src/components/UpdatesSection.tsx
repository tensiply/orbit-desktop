import { useState } from 'react'
import {
  RefreshCw, ArrowUpCircle, CheckCircle2, Terminal, Monitor, Loader2,
  MoreHorizontal, Download, Hammer,
} from 'lucide-react'
import { listen } from '@tauri-apps/api/event'
import { useAppStore } from '../store'
import { tauriService } from '../services/tauri'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'

// ── Component row ──────────────────────────────────────────────────────────────

function ComponentRow({
  label,
  icon,
  current,
  latest,
  hasUpdate,
  onUpdate,
  onCompile,
  updating,
}: {
  label: string
  icon: React.ReactNode
  current: string | null
  latest: string | null
  hasUpdate: boolean
  onUpdate?: () => void
  onCompile?: () => void
  updating?: boolean
}) {
  return (
    <div className="flex items-start gap-4 px-6 py-4 border-b border-foreground/5">
      <div className="flex items-center gap-2 w-28 shrink-0 mt-0.5">
        <span className="text-foreground/40">{icon}</span>
        <span className="text-xs font-medium text-foreground">{label}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-mono text-foreground/60">
            {current ?? 'not installed'}
          </span>
          {hasUpdate && latest && (
            <>
              <span className="text-foreground/25 text-xs">→</span>
              <span className="text-xs font-mono text-primary">{latest}</span>
              <span className="text-[9px] px-1.5 py-px rounded-full bg-primary/15 text-primary/80 font-medium">
                update available
              </span>
            </>
          )}
          {!hasUpdate && latest && current && (
            <span className="text-[9px] px-1.5 py-px rounded-full bg-foreground/8 text-foreground/40 font-medium">
              up to date
            </span>
          )}
          {!latest && current && (
            <span className="text-[9px] text-foreground/30">
              (no release data)
            </span>
          )}
        </div>
      </div>

      {hasUpdate && (
        <div className="flex items-center gap-1 shrink-0">
          {onUpdate && (
            <Button
              size="xs"
              variant={updating ? 'ghost' : 'default'}
              onClick={onUpdate}
              disabled={updating}
              className="gap-1.5 text-[10px]"
            >
              {updating
                ? <><Loader2 size={11} className="animate-spin" />Updating…</>
                : <><ArrowUpCircle size={11} />Update</>
              }
            </Button>
          )}

          {(onUpdate || onCompile) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="xs"
                  variant="ghost"
                  disabled={updating}
                  className="px-1.5"
                >
                  <MoreHorizontal size={13} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-44">
                {onUpdate && (
                  <DropdownMenuItem onClick={onUpdate} disabled={updating} className="gap-2 text-xs">
                    <Download size={12} />
                    Download binary
                  </DropdownMenuItem>
                )}
                {onCompile && (
                  <DropdownMenuItem onClick={onCompile} disabled={updating} className="gap-2 text-xs">
                    <Hammer size={12} />
                    Compile from source
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}
    </div>
  )
}

// ── UpdatesSection ─────────────────────────────────────────────────────────────

export function UpdatesSection() {
  const cliInfo         = useAppStore((s) => s.cliInfo)
  const updateCheck     = useAppStore((s) => s.updateCheck)
  const updatesChecking = useAppStore((s) => s.updatesChecking)
  const checkUpdates    = useAppStore((s) => s.checkUpdates)
  const checkCli        = useAppStore((s) => s.checkCli)
  const openWizard      = useAppStore((s) => s.openSetupWizard)

  const [cliUpdating, setCliUpdating]       = useState(false)
  const [cliUpdateLog, setCliUpdateLog]     = useState<string[]>([])
  const [cliUpdateError, setCliUpdateError] = useState<string | null>(null)
  const [cliUpdateDone, setCliUpdateDone]   = useState(false)

  const runCliInstall = async (method: 'github' | 'cargo') => {
    setCliUpdating(true)
    setCliUpdateLog([])
    setCliUpdateError(null)
    setCliUpdateDone(false)

    const unlisten = await listen<string>('cli_install_output', (ev) => {
      setCliUpdateLog((prev) => [...prev, ev.payload])
    })

    try {
      await tauriService.cliInstall(method)
      await checkCli()
      await checkUpdates()
      setCliUpdateDone(true)
    } catch (e) {
      setCliUpdateError(String(e))
    } finally {
      setCliUpdating(false)
      unlisten()
    }
  }

  const cliCurrent   = cliInfo?.version ?? null
  const cliLatest    = updateCheck?.cli.latest ?? null
  const cliHasUpdate = updateCheck?.cli.has_update ?? false

  const desktopCurrent   = updateCheck?.desktop.current ?? null
  const desktopLatest    = updateCheck?.desktop.latest ?? null
  const desktopHasUpdate = updateCheck?.desktop.has_update ?? false

  return (
    <div className="flex flex-col">
      {/* Check button */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-foreground/5">
        <div className="flex flex-col">
          <span className="text-xs text-foreground/60">
            {updateCheck
              ? (cliHasUpdate || desktopHasUpdate)
                ? 'Updates available'
                : 'Everything is up to date'
              : 'Check for updates to the CLI and desktop app.'}
          </span>
        </div>
        <Button
          size="xs"
          variant="outline"
          onClick={() => void checkUpdates()}
          disabled={updatesChecking}
          className="gap-1.5 text-[10px]"
        >
          {updatesChecking
            ? <><Loader2 size={11} className="animate-spin" />Checking…</>
            : <><RefreshCw size={11} />Check for updates</>
          }
        </Button>
      </div>

      {/* CLI row */}
      {cliInfo?.installed ? (
        <ComponentRow
          label="Orbit CLI"
          icon={<Terminal size={13} />}
          current={cliCurrent}
          latest={cliLatest}
          hasUpdate={cliHasUpdate}
          onUpdate={() => void runCliInstall('github')}
          onCompile={() => void runCliInstall('cargo')}
          updating={cliUpdating}
        />
      ) : (
        <div className="flex items-center justify-between px-6 py-4 border-b border-foreground/5">
          <div className="flex items-center gap-2">
            <Terminal size={13} className="text-foreground/40" />
            <div>
              <span className="text-xs text-foreground/70">Orbit CLI</span>
              <p className="text-[11px] text-foreground/40 mt-0.5">Not installed on this machine.</p>
            </div>
          </div>
          <Button size="xs" onClick={openWizard} className="text-[10px]">
            Install
          </Button>
        </div>
      )}

      {/* Desktop row */}
      <ComponentRow
        label="Orbit Desktop"
        icon={<Monitor size={13} />}
        current={desktopCurrent}
        latest={desktopLatest}
        hasUpdate={desktopHasUpdate}
        onUpdate={
          desktopHasUpdate
            ? () => {
                void window.open?.('https://github.com/tensiply/orbit-desktop/releases/latest', '_blank')
              }
            : undefined
        }
      />

      {/* CLI update log — visible as soon as an update starts */}
      {(cliUpdating || cliUpdateLog.length > 0 || cliUpdateDone || cliUpdateError) && (
        <div className="px-6 py-3 border-b border-foreground/5">
          <p className="text-[10px] text-foreground/40 mb-1.5">Output</p>
          <div className="max-h-40 overflow-y-auto rounded-lg bg-black/50 p-2 font-mono text-[10px] text-green-400/80 leading-relaxed">
            {cliUpdateLog.length === 0 && cliUpdating && (
              <span className="text-foreground/30">Starting…</span>
            )}
            {cliUpdateLog.map((line, i) => <div key={i}>{line}</div>)}
          </div>
          {cliUpdateDone && (
            <div className="flex items-center gap-1.5 mt-2">
              <CheckCircle2 size={12} className="text-primary" />
              <span className="text-[11px] text-primary">CLI updated successfully</span>
            </div>
          )}
          {cliUpdateError && (
            <p className="text-[11px] text-destructive mt-2 bg-destructive/10 rounded px-2 py-1">
              {cliUpdateError}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
