import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

/// Download, verify (signature), install the latest desktop release and relaunch.
/// Throws if no update is available or the updater is unavailable (e.g. dev builds).
export async function installDesktopUpdate(): Promise<void> {
  const update = await check()
  if (!update) {
    throw new Error('No update available')
  }
  await update.downloadAndInstall()
  await relaunch()
}
