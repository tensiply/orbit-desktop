// Ergonomic toast API on top of Sonner. Prefer this over importing `toast`
// directly so notification styling and future policy (grouping, muting, native
// OS bridging) stay in one place.
//
//   import { notify } from '@/lib/notify'
//   notify.success('Session finished')
//   notify.error('Import failed', { description: err.message })
//
// `toast` is re-exported for advanced cases (promise, custom JSX, manual dismiss).
import { toast, type ExternalToast } from "sonner"

export { toast }
export type NotifyOptions = ExternalToast

export const notify = {
  success: (message: string, opts?: NotifyOptions) => toast.success(message, opts),
  error: (message: string, opts?: NotifyOptions) => toast.error(message, opts),
  info: (message: string, opts?: NotifyOptions) => toast.info(message, opts),
  warning: (message: string, opts?: NotifyOptions) => toast.warning(message, opts),
  message: (message: string, opts?: NotifyOptions) => toast(message, opts),
  /** Drive a toast from a promise's lifecycle (loading → success/error). */
  promise: toast.promise,
  /** Dismiss a specific toast by id, or all toasts when omitted. */
  dismiss: (id?: string | number) => toast.dismiss(id),
}
