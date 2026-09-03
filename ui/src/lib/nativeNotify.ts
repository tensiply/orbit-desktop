// OS-level notifications via the Tauri notification plugin. Used to surface
// events when the app window is in the background — an in-app toast is useless
// if the user isn't looking at the window. Permission is resolved lazily and
// cached; a denied prompt simply no-ops on later calls.
import { getCurrentWindow } from "@tauri-apps/api/window"
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification"

let cachedPermission: boolean | null = null

/** Resolve (and cache) notification permission, prompting once if needed. */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (cachedPermission !== null) return cachedPermission
  try {
    let granted = await isPermissionGranted()
    if (!granted) granted = (await requestPermission()) === "granted"
    cachedPermission = granted
    return granted
  } catch (err) {
    console.error("[orbit] notification permission check failed", err)
    cachedPermission = false
    return false
  }
}

export interface NativeNotifyInput {
  title: string
  body?: string
}

/**
 * Fire an OS notification unconditionally (permission permitting).
 * Safe to call fire-and-forget; failures are swallowed with a console error.
 */
export async function sendNativeNotification({ title, body }: NativeNotifyInput): Promise<void> {
  try {
    if (!(await ensureNotificationPermission())) return
    sendNotification({ title, body })
  } catch (err) {
    console.error("[orbit] native notification failed", err)
  }
}

/** As {@link sendNativeNotification}, but only when the main window is NOT focused. */
export async function notifyWhenUnfocused(input: NativeNotifyInput): Promise<void> {
  try {
    if (await getCurrentWindow().isFocused()) return
  } catch (err) {
    console.error("[orbit] focus check failed", err)
    return
  }
  await sendNativeNotification(input)
}
