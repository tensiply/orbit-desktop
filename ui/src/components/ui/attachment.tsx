import { Loader2, Check, AlertCircle, X, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

export type AttachmentStatus = 'uploading' | 'done' | 'error'

/**
 * Attachment — compact card for a single file, shown while it is being uploaded
 * and briefly after it completes. Renders an icon, the file name and a status
 * indicator (spinner / check / error), with an optional dismiss button.
 */
export function Attachment({
  name,
  status,
  onDismiss,
}: {
  name:      string
  status:    AttachmentStatus
  onDismiss?: () => void
}) {
  return (
    <div
      data-orbit-zone="orbit.desktop.sidebar.panel.attachment"
      className={cn(
        'flex items-center gap-2 w-full px-2 py-1.5 rounded-md border text-xs min-w-0',
        status === 'error'
          ? 'border-destructive/40 bg-destructive/5 text-destructive'
          : 'border-sidebar-border/60 bg-sidebar-accent/30 text-sidebar-foreground/70',
      )}
    >
      <FileText size={13} className="shrink-0 text-sidebar-foreground/40" />
      <span className="flex-1 min-w-0 truncate">{name}</span>
      {status === 'uploading' && <Loader2 size={12} className="shrink-0 animate-spin text-sidebar-foreground/40" />}
      {status === 'done'      && <Check size={12} className="shrink-0 text-primary" />}
      {status === 'error'     && <AlertCircle size={12} className="shrink-0" />}
      {onDismiss && status !== 'uploading' && (
        <button
          onClick={onDismiss}
          className="shrink-0 text-sidebar-foreground/30 hover:text-sidebar-foreground/70 transition-colors"
          title="Dismiss"
        >
          <X size={12} />
        </button>
      )}
    </div>
  )
}
