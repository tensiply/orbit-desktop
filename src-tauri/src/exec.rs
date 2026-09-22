use std::collections::HashMap;
use std::io::{Read, Write};
use std::path::Path;
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};

use serde::Serialize;
use tauri::{AppHandle, Emitter, State};

/// Tracks running executions so they can be aborted by id.
#[derive(Default, Clone)]
pub struct ExecRegistry(Arc<Mutex<HashMap<String, Child>>>);

#[derive(Clone, Serialize)]
struct ExecOutput {
    exec_id: String,
    chunk: String,
}

#[derive(Clone, Serialize)]
struct ExecDone {
    exec_id: String,
    code: Option<i32>,
}

/// Run `command` in `work_dir`, streaming its combined stdout/stderr to the
/// frontend as `exec-output` events and mirroring it to `artifact_path` so a
/// session can read the same clean text. Emits `exec-done` with the exit code
/// when it finishes. The caller supplies `exec_id` and attaches its listeners
/// before invoking, so no early output is lost.
#[tauri::command]
pub async fn exec_run(
    app: AppHandle,
    registry: State<'_, ExecRegistry>,
    exec_id: String,
    work_dir: String,
    command: String,
    artifact_path: String,
) -> Result<(), String> {
    // stderr is merged into stdout at the shell level so the stream stays ordered.
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/sh".into());
    let mut cmd = Command::new(shell);
    cmd.arg("-c")
        .arg(format!("NO_COLOR=1 {command} 2>&1"))
        .current_dir(&work_dir)
        .env("NO_COLOR", "1")
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    // Make the bundled orbit CLI available, mirroring the terminal PTY.
    if let Some(dir) = crate::infrastructure::orbit_sidecar::sidecar_dir() {
        let path = std::env::var("PATH").unwrap_or_default();
        cmd.env("PATH", format!("{}:{path}", dir.display()));
    }

    let mut child = cmd.spawn().map_err(|e| format!("spawn: {e}"))?;
    let mut stdout = child.stdout.take().ok_or("no stdout pipe")?;

    let regmap = registry.0.clone();
    regmap.lock().unwrap().insert(exec_id.clone(), child);

    std::thread::spawn(move || {
        // Truncate/create the artifact; a missing dir just means no file mirror.
        if let Some(parent) = Path::new(&artifact_path).parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        let mut file = std::fs::File::create(&artifact_path).ok();

        let mut buf = [0u8; 4096];
        loop {
            match stdout.read(&mut buf) {
                Ok(0) | Err(_) => break,
                Ok(n) => {
                    if let Some(f) = file.as_mut() {
                        let _ = f.write_all(&buf[..n]);
                        let _ = f.flush();
                    }
                    let chunk = String::from_utf8_lossy(&buf[..n]).into_owned();
                    let _ = app.emit(
                        "exec-output",
                        ExecOutput {
                            exec_id: exec_id.clone(),
                            chunk,
                        },
                    );
                }
            }
        }

        // Reap the child and report its exit code.
        let code = regmap
            .lock()
            .unwrap()
            .remove(&exec_id)
            .and_then(|mut c| c.wait().ok())
            .and_then(|s| s.code());
        let _ = app.emit("exec-done", ExecDone { exec_id, code });
    });

    Ok(())
}

/// Abort a running execution. The reader thread then sees EOF and emits `exec-done`.
#[tauri::command]
pub async fn exec_kill(registry: State<'_, ExecRegistry>, exec_id: String) -> Result<(), String> {
    if let Some(child) = registry.0.lock().unwrap().get_mut(&exec_id) {
        let _ = child.kill();
    }
    Ok(())
}
