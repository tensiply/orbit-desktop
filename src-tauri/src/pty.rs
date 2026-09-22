use anyhow::Result;
use portable_pty::{CommandBuilder, NativePtySystem, PtySize, PtySystem};
use std::io::Read;
use tauri::{AppHandle, Emitter, State};
use uuid::Uuid;

use crate::domain::{ports::pty_repository::PtyRepository, pty::PtyDataEvent};
use crate::infrastructure::pty_registry::{IpcCmd, PtyHandle, PtyRegistry};

/// The user's default interactive shell: `$SHELL` (fallback `/bin/bash`) on
/// unix, `%COMSPEC%` (fallback `cmd.exe`) on Windows.
#[cfg(unix)]
fn default_shell_command() -> CommandBuilder {
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".into());
    CommandBuilder::new(shell)
}

#[cfg(windows)]
fn default_shell_command() -> CommandBuilder {
    let shell = std::env::var("COMSPEC").unwrap_or_else(|_| "cmd.exe".into());
    CommandBuilder::new(shell)
}

/// Open a terminal tab and return its tab_id. Selection:
/// - `tmux_session` non-empty → attach to that tmux session (unix).
/// - else `session_id` present → attach to the daemon-owned PTY over IPC
///   (Windows, or opt-in unix via `ORBIT_DAEMON_PTY`).
/// - else → open the user's default shell.
///
/// PTY creation and the reader-thread setup stay here (presentation) because
/// the reader emits Tauri events — that coupling to AppHandle is intentional.
/// The resulting handle is stored in PtyRegistry (infrastructure).
#[tauri::command]
pub async fn pty_open(
    app: AppHandle,
    registry: State<'_, PtyRegistry>,
    tmux_session: Option<String>,
    session_id: Option<String>,
    cwd: Option<String>,
) -> Result<String, String> {
    let tab_id = Uuid::new_v4().to_string();

    // A daemon-owned session carries a session id but no tmux name — attach over
    // IPC rather than spawning a local PTY. (The daemon owns the engine's PTY.)
    let tmux_session = tmux_session.filter(|s| !s.is_empty());
    if tmux_session.is_none() {
        if let Some(sid) = session_id {
            attach_daemon_pty(app, registry.inner().clone(), tab_id.clone(), sid)
                .await
                .map_err(|e| e.to_string())?;
            return Ok(tab_id);
        }
    }

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
            // A GUI launch (desktop shortcut) has no TERM, so tmux attach fails
            // with "terminal does not support clear". xterm.js emulates an
            // xterm-256color terminal — set it explicitly instead of relying on
            // an inherited TERM.
            c.env("TERM", "xterm-256color");
            c
        } else {
            let mut c = default_shell_command();
            c.env("TERM", "xterm-256color");
            // Suppress oh-my-zsh themes and p10k instant-prompt so the shell
            // starts clean inside orbit without uninstalling anything. These are
            // zsh/bash-only, so they're pointless on the Windows shell.
            #[cfg(unix)]
            {
                c.env("ZSH_THEME", "");
                c.env("POWERLEVEL9K_INSTANT_PROMPT", "off");
            }
            c.env("ORBIT_TERMINAL", "1");
            // Make the bundled orbit CLI available to commands typed in the
            // terminal. Prepend the sidecar dir using the platform PATH separator.
            if let Some(dir) = crate::infrastructure::orbit_sidecar::sidecar_dir() {
                let existing = std::env::var_os("PATH").unwrap_or_default();
                let mut entries = vec![dir];
                entries.extend(std::env::split_paths(&existing));
                if let Ok(joined) = std::env::join_paths(entries) {
                    c.env("PATH", joined);
                }
            }
            if let Some(ref dir) = cwd {
                c.cwd(dir);
            }
            c
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
                            PtyDataEvent {
                                tab_id: tid_reader.clone(),
                                data,
                            },
                        );
                    }
                }
            }
        });

        reg.insert(
            tid,
            PtyHandle::Local {
                writer,
                master: pair.master,
                _child: child,
            },
        );
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())?;

    Ok(tab_id)
}

/// Attach to a daemon-owned PTY session over IPC and bridge it to a terminal
/// tab. A pump task owns the async `AttachChannel`: it forwards PTY output to
/// the frontend as `pty-data` events and drains input/resize/detach commands
/// (posted synchronously by the registry) into the channel.
async fn attach_daemon_pty(
    app: AppHandle,
    reg: PtyRegistry,
    tab_id: String,
    session_id: String,
) -> Result<()> {
    let mut channel = orbit_client::ipc::open_attach(&session_id, 80, 24)
        .await
        .map_err(|e| anyhow::anyhow!("attach session {session_id}: {e}"))?;

    let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<IpcCmd>();
    let tid = tab_id.clone();
    tokio::spawn(async move {
        loop {
            tokio::select! {
                out = channel.recv_output() => match out {
                    Ok(Some(bytes)) => {
                        let data = String::from_utf8_lossy(&bytes).into_owned();
                        let _ = app.emit(
                            "pty-data",
                            PtyDataEvent { tab_id: tid.clone(), data },
                        );
                    }
                    // Session ended or the stream broke — stop pumping.
                    Ok(None) | Err(_) => break,
                },
                cmd = rx.recv() => match cmd {
                    Some(IpcCmd::Input(b)) => { let _ = channel.send_input(&b).await; }
                    Some(IpcCmd::Resize(c, r)) => { let _ = channel.resize(c, r).await; }
                    // Explicit detach, or every sender dropped (tab closed).
                    Some(IpcCmd::Detach) | None => { let _ = channel.detach().await; break; }
                }
            }
        }
    });

    reg.insert(tab_id, PtyHandle::Ipc { tx });
    Ok(())
}

#[tauri::command]
pub async fn pty_write(
    registry: State<'_, PtyRegistry>,
    tab_id: String,
    data: String,
) -> Result<(), String> {
    let reg = registry.inner().clone();
    tokio::task::spawn_blocking(move || {
        reg.write(&tab_id, data.as_bytes())
            .map_err(|e| e.to_string())
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
    tokio::task::spawn_blocking(move || reg.resize(&tab_id, cols, rows).map_err(|e| e.to_string()))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn pty_close(registry: State<'_, PtyRegistry>, tab_id: String) -> Result<(), String> {
    let reg = registry.inner().clone();
    tokio::task::spawn_blocking(move || {
        reg.close(&tab_id);
        Ok::<_, String>(())
    })
    .await
    .map_err(|e| e.to_string())?
}
