//! Resolution of the bundled `orbit` CLI sidecar.
//!
//! Tauri installs `externalBin` sidecars next to the main app binary (with the
//! target-triple suffix stripped) — the same location the shell plugin resolves
//! them from. We read that directory from the current executable. In dev builds
//! the sidecar is not bundled, so callers fall back to `orbit` on PATH.

use std::path::PathBuf;

/// Absolute path to the bundled `orbit` binary, if it exists next to the app.
pub fn sidecar_path() -> Option<PathBuf> {
    let dir = std::env::current_exe().ok()?.parent()?.to_path_buf();
    let bin = dir.join("orbit");
    bin.exists().then_some(bin)
}

/// Directory containing the bundled `orbit` binary, for PATH injection.
pub fn sidecar_dir() -> Option<PathBuf> {
    Some(sidecar_path()?.parent()?.to_path_buf())
}

/// The `orbit` program to invoke: the bundled sidecar when present, otherwise
/// resolved from PATH. Non-stable builds have no bundled sidecar and target
/// their channel's CLI (`dev-orbit`, `orbit-canary`) so the app drives the same
/// isolated daemon it set up; stable builds fall back to `orbit`.
pub fn orbit_program() -> PathBuf {
    sidecar_path().unwrap_or_else(|| {
        if cfg!(feature = "dev") {
            PathBuf::from("dev-orbit")
        } else if cfg!(feature = "canary") {
            PathBuf::from("orbit-canary")
        } else {
            PathBuf::from("orbit")
        }
    })
}
