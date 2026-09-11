import { useEffect, useState } from 'react'
import { tauriService } from '../services/tauri'

/**
 * Loads the Makefile targets for a working directory. Returns an empty array
 * until they resolve (or when the scope has none), so callers can gate a
 * MakeRunner on `targets.length > 0`.
 */
export function useMakefileTargets(workDir: string): string[] {
  const [targets, setTargets] = useState<string[]>([])

  useEffect(() => {
    let alive = true
    setTargets([])
    tauriService.makefileTargets(workDir).then((ts) => {
      if (alive) setTargets(ts)
    })
    return () => {
      alive = false
    }
  }, [workDir])

  return targets
}
