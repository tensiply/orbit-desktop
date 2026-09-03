import { RefreshCw, ArrowUpCircle, Terminal, Monitor, Loader2 } from 'lucide-react'
import { useAppStore } from '../store'
import { Button } from './ui/button'

// ── Component row ──────────────────────────────────────────────────────────────

function ComponentRow({
  label,
  icon,
  current,
  latest,
  hasUpdate,
  onUpdate,
}: {
  label: string
  icon: React.ReactNode
  current: string | null
  latest: string | null
  hasUpdate: boolean
  onUpdate?: () => void
}) {
  return (
    <div className="flex items-start gap-4 px-6 py-4 border-b border-foreground/5">
      <div className="flex items-center gap-2 w-28 shrink-0 mt-0.5">
        <span className="text-foreground/40">{icon}</span>
        <span className="text-xs font-medium text-foreground">{label}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-mono text-foreground/60">{current ?? '—'}</span>
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
        </div>
      </div>

      {hasUpdate && onUpdate && (
        <Button size="xs" onClick={onUpdate} className="gap-1.5 text-[10px] shrink-0">
          <ArrowUpCircle size={11} />
          Update
        </Button>
      )}
    </div>
  )
}

// ── UpdatesSection ─────────────────────────────────────────────────────────────

export function UpdatesSection() {
  const updateCheck     = useAppStore((s) => s.updateCheck)
  const updatesChecking = useAppStore((s) => s.updatesChecking)
  const checkUpdates    = useAppStore((s) => s.checkUpdates)

  const cliCurrent       = updateCheck?.cli.current ?? null
  const desktopCurrent   = updateCheck?.desktop.current ?? null
  const desktopLatest    = updateCheck?.desktop.latest ?? null
  const desktopHasUpdate = updateCheck?.desktop.has_update ?? false

  return (
    <div className="flex flex-col">
      {/* Check button */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-foreground/5">
        <span className="text-xs text-foreground/60">
          {updateCheck
            ? desktopHasUpdate
              ? 'Update available'
              : 'Everything is up to date'
            : 'Check for a desktop update.'}
        </span>
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

      {/* CLI row — bundled with the app, read-only */}
      <div className="flex items-start gap-4 px-6 py-4 border-b border-foreground/5">
        <div className="flex items-center gap-2 w-28 shrink-0 mt-0.5">
          <span className="text-foreground/40"><Terminal size={13} /></span>
          <span className="text-xs font-medium text-foreground">Orbit CLI</span>
        </div>
        <div className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-mono text-foreground/60">{cliCurrent ?? '—'}</span>
          <span className="text-[9px] px-1.5 py-px rounded-full bg-foreground/8 text-foreground/40 font-medium">
            bundled
          </span>
        </div>
      </div>

      {/* Desktop row */}
      <ComponentRow
        label="Orbit Desktop"
        icon={<Monitor size={13} />}
        current={desktopCurrent}
        latest={desktopLatest}
        hasUpdate={desktopHasUpdate}
        onUpdate={
          desktopHasUpdate
            ? () => { void window.open?.('https://github.com/tensiply/orbit-desktop/releases/latest', '_blank') }
            : undefined
        }
      />
    </div>
  )
}
