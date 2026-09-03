//! First-run desktop integration for AppImage builds.
//!
//! An AppImage is a single portable file — it doesn't register itself with the
//! desktop environment, so the app only shows up in the launcher if a `.desktop`
//! entry points at it. When we detect we're running from an AppImage (the
//! `APPIMAGE` env var is set to its path), we write a launcher entry + icon on
//! first run, so the user doesn't have to start it from a terminal.

use std::path::{Path, PathBuf};

const APP_ID: &str = "com.tensiply.orbit-desktop";

/// Best-effort: install a launcher entry when running as an AppImage. Never
/// fails the app — logs and returns on any problem.
pub fn integrate() {
    if let Err(e) = try_integrate() {
        tracing::debug!("appimage desktop integration skipped: {e}");
    }
}

fn try_integrate() -> std::io::Result<()> {
    // `APPIMAGE` is only set when launched from the packaged AppImage.
    let appimage = match std::env::var("APPIMAGE") {
        Ok(p) if !p.is_empty() => p,
        _ => return Ok(()),
    };

    let data = data_home()?;
    let apps = data.join("applications");
    let desktop = apps.join(format!("{APP_ID}.desktop"));
    if desktop.exists() {
        return Ok(()); // already integrated on a previous run
    }
    std::fs::create_dir_all(&apps)?;

    // Prefer an installed icon name; fall back to the app id (launcher shows a
    // generic icon if it can't resolve it, but the entry still works).
    let icon = install_icon(&data).unwrap_or_else(|| APP_ID.to_string());

    let entry = format!(
        "[Desktop Entry]\n\
         Type=Application\n\
         Name=Orbit Desktop\n\
         GenericName=AI Development Toolkit\n\
         Comment=AI-assisted development — scope-aware, daemon-based, multi-engine\n\
         Exec=\"{appimage}\" %U\n\
         TryExec={appimage}\n\
         Icon={icon}\n\
         Terminal=false\n\
         Categories=Development;IDE;\n\
         Keywords=ai;development;claude;gemini;orbit;tensiply;\n\
         StartupNotify=true\n\
         StartupWMClass=Orbit Desktop\n"
    );
    std::fs::write(&desktop, entry)?;

    // Refresh the launcher database (best-effort; harmless if the tool is absent).
    let _ = std::process::Command::new("update-desktop-database")
        .arg(&apps)
        .status();

    tracing::info!("installed AppImage launcher entry at {}", desktop.display());
    Ok(())
}

/// Copy the AppImage icon into the hicolor theme so `Icon={APP_ID}` resolves.
/// Returns the icon name to use, or None if no icon could be installed.
fn install_icon(data: &Path) -> Option<String> {
    // The AppImage mounts its root at `APPDIR`; `.DirIcon` is its top-level icon.
    let appdir = std::env::var("APPDIR").ok()?;
    let src = candidate_icon(&appdir)?;

    let dir = data.join("icons/hicolor/256x256/apps");
    std::fs::create_dir_all(&dir).ok()?;
    let dst = dir.join(format!("{APP_ID}.png"));
    std::fs::copy(&src, &dst).ok()?;

    let _ = std::process::Command::new("gtk-update-icon-cache")
        .args(["-f", "-t"])
        .arg(data.join("icons/hicolor"))
        .status();

    Some(APP_ID.to_string())
}

fn candidate_icon(appdir: &str) -> Option<PathBuf> {
    let candidates = [
        PathBuf::from(appdir).join(".DirIcon"),
        PathBuf::from(appdir).join(format!("usr/share/icons/hicolor/256x256/apps/{APP_ID}.png")),
        PathBuf::from(appdir).join(format!("{APP_ID}.png")),
    ];
    candidates.into_iter().find(|p| p.exists())
}

fn data_home() -> std::io::Result<PathBuf> {
    if let Ok(x) = std::env::var("XDG_DATA_HOME") {
        if !x.is_empty() {
            return Ok(PathBuf::from(x));
        }
    }
    let home = std::env::var("HOME")
        .map_err(|_| std::io::Error::new(std::io::ErrorKind::NotFound, "HOME is not set"))?;
    Ok(PathBuf::from(home).join(".local/share"))
}
