use anyhow::Result;
use portable_pty::{CommandBuilder, NativePtySystem, PtySize, PtySystem};
use std::io::Read;
use tauri::{AppHandle, Emitter, State};
use uuid::Uuid;

use crate::domain::{ports::pty_repository::PtyRepository, pty::PtyDataEvent};
use crate::infrastructure::pty_registry::{PtyHandle, PtyRegistry};

/// Open a PTY and return the tab_id.
/// If `tmux_session` is Some, attaches to that tmux session.
/// Otherwise opens the user's default shell.
///
/// PTY creation and the reader-thread setup stay here (presentation) because
/// the reader emits Tauri events — that coupling to AppHandle is intentional.
/// The resulting handle is stored in PtyRegistry (infrastructure).
#[tauri::command]
pub async fn pty_open(
    app: AppHandle,
    registry: State<'_, PtyRegistry>,
    tmux_session: Option<String>,
) -> Result<String, String> {
    let tab_id = Uuid::new_v4().to_string();
    let tid = tab_id.clone();
    let reg = registry.inner().clone();

    tokio::task::spawn_blocking(move || -> Result<()> {
        let pty_system = NativePtySystem::default();
        let pair = pty_system
            .openpty(PtySize {
                rows: 24,
                cols: 80,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| anyhow::anyhow!("openpty: {e}"))?;

        let cmd = if let Some(ref name) = tmux_session {
            let mut c = CommandBuilder::new("tmux");
            c.args(["attach-session", "-t", name]);
            // Clear nesting vars so tmux creates a fresh client inside this PTY
            // instead of switching the caller's existing tmux client.
            c.env("TMUX", "");
            c.env("TMUX_PANE", "");
            c
        } else {
            let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".into());
            CommandBuilder::new(shell)
        };

        let child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| anyhow::anyhow!("spawn: {e}"))?;

        // Clone reader before moving master into handle
        let mut reader = pair
            .master
            .try_clone_reader()
            .map_err(|e| anyhow::anyhow!("clone reader: {e}"))?;

        // take_writer must be called before moving master — can only be called once
        let writer = pair
            .master
            .take_writer()
            .map_err(|e| anyhow::anyhow!("take writer: {e}"))?;

        // Emit PTY output as Tauri events (presentation concern — stays here)
        let tid_reader = tid.clone();
        let app_reader = app.clone();
        std::thread::spawn(move || {
            let mut buf = [0u8; 4096];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) | Err(_) => break,
                    Ok(n) => {
                        let data = String::from_utf8_lossy(&buf[..n]).into_owned();
                        let _ = app_reader.emit(
                            "pty-data",
                            PtyDataEvent { tab_id: tid_reader.clone(), data },
                        );
                    }
                }
            }
        });

        reg.insert(tid, PtyHandle { writer, master: pair.master, _child: child });
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())?;

    Ok(tab_id)
}

#[tauri::command]
pub async fn pty_write(
    registry: State<'_, PtyRegistry>,
    tab_id: String,
    data: String,
) -> Result<(), String> {
    let reg = registry.inner().clone();
    tokio::task::spawn_blocking(move || {
        reg.write(&tab_id, data.as_bytes()).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn pty_resize(
    registry: State<'_, PtyRegistry>,
    tab_id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    let reg = registry.inner().clone();
    tokio::task::spawn_blocking(move || {
        reg.resize(&tab_id, cols, rows).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn pty_close(
    registry: State<'_, PtyRegistry>,
    tab_id: String,
) -> Result<(), String> {
    let reg = registry.inner().clone();
    tokio::task::spawn_blocking(move || {
        reg.close(&tab_id);
        Ok::<_, String>(())
    })
    .await
    .map_err(|e| e.to_string())?
}
