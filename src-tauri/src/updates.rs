use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

use crate::domain::ports::workspace_repository::WorkspaceRepository;
use crate::infrastructure::orbit_sidecar::orbit_program;

// ── Types ──────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct CliInfo {
    pub installed: bool,
    pub version: Option<String>,
    pub path: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct SetupStatus {
    pub has_workspaces: bool,
}

#[derive(Debug, Serialize)]
pub struct ComponentUpdate {
    pub current: Option<String>,
    pub latest: Option<String>,
    pub has_update: bool,
}

#[derive(Debug, Serialize)]
pub struct UpdateCheck {
    pub cli: ComponentUpdate,
    pub desktop: ComponentUpdate,
}

#[derive(Debug, Deserialize)]
struct GithubRelease {
    tag_name: String,
}

// ── Commands ───────────────────────────────────────────────────────────────────

/// Report the bundled `orbit` CLI version. The CLI now ships with the app as a
/// sidecar, so it is always available — this just surfaces its version.
#[tauri::command]
pub async fn cli_check() -> Result<CliInfo, String> {
    let orbit = orbit_program();
    let version = Command::new(&orbit)
        .arg("--version")
        .output()
        .await
        .ok()
        .and_then(|o| {
            let bytes = if o.status.success() {
                o.stdout
            } else {
                o.stderr
            };
            String::from_utf8(bytes).ok().map(|s| s.trim().to_string())
        });

    Ok(CliInfo {
        installed: version.is_some(),
        version,
        path: Some(orbit.to_string_lossy().to_string()),
    })
}

/// Setup status: whether at least one workspace is registered. The CLI is
/// bundled, so it no longer factors into setup completeness.
#[tauri::command]
pub async fn setup_check(
    workspace_repo: State<'_, Arc<dyn WorkspaceRepository>>,
) -> Result<SetupStatus, String> {
    Ok(SetupStatus {
        has_workspaces: !workspace_repo.list().is_empty(),
    })
}

/// Run `orbit workspace add <path> [--name <name>]` via the bundled CLI and
/// stream output through the `setup_output` Tauri event.
#[tauri::command]
pub async fn orbit_workspace_add(
    path: String,
    name: Option<String>,
    app: AppHandle,
) -> Result<(), String> {
    use std::process::Stdio;

    let mut args: Vec<String> = vec!["workspace".into(), "add".into(), path];
    if let Some(n) = name {
        args.push("--name".into());
        args.push(n);
    }

    let mut child = Command::new(orbit_program())
        .args(&args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("failed to start orbit: {e}"))?;

    let stderr = child.stderr.take().expect("stderr piped");
    let app_err = app.clone();
    tokio::spawn(async move {
        let mut reader = BufReader::new(stderr).lines();
        while let Ok(Some(line)) = reader.next_line().await {
            let _ = app_err.emit("setup_output", &line);
        }
    });

    let stdout = child.stdout.take().expect("stdout piped");
    let mut reader = BufReader::new(stdout).lines();
    while let Ok(Some(line)) = reader.next_line().await {
        let _ = app.emit("setup_output", &line);
    }

    let status = child.wait().await.map_err(|e| e.to_string())?;
    if !status.success() {
        return Err(format!(
            "orbit workspace add failed (exit {})",
            status.code().unwrap_or(-1)
        ));
    }
    Ok(())
}

/// Check whether a newer desktop release is available via GitHub releases.
/// The bundled CLI updates together with the app, so it is reported for display
/// only and never flags a separate update.
#[tauri::command]
pub async fn check_updates(app: AppHandle) -> Result<UpdateCheck, String> {
    let desktop_version = app.package_info().version.to_string();

    let cli_current = cli_check().await?.version;

    let client = build_client(60)?;
    let desktop_latest = fetch_latest_github_release(&client, "tensiply", "orbit-desktop")
        .await
        .ok();

    let desktop_has_update = match &desktop_latest {
        Some(lat) => is_older(&desktop_version, lat),
        None => false,
    };

    Ok(UpdateCheck {
        cli: ComponentUpdate {
            current: cli_current,
            latest: None,
            has_update: false,
        },
        desktop: ComponentUpdate {
            current: Some(desktop_version),
            latest: desktop_latest,
            has_update: desktop_has_update,
        },
    })
}

// ── Helpers ────────────────────────────────────────────────────────────────────

fn build_client(timeout_secs: u64) -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .user_agent("orbit-desktop")
        .timeout(std::time::Duration::from_secs(timeout_secs))
        .build()
        .map_err(|e| e.to_string())
}

async fn fetch_latest_github_release(
    client: &reqwest::Client,
    owner: &str,
    repo: &str,
) -> anyhow::Result<String> {
    let url = format!("https://api.github.com/repos/{owner}/{repo}/releases/latest");
    let release: GithubRelease = client.get(&url).send().await?.json().await?;
    Ok(release.tag_name.trim_start_matches('v').to_string())
}

fn is_older(current: &str, latest: &str) -> bool {
    let cur = current
        .trim_start_matches('v')
        .split_whitespace()
        .last()
        .unwrap_or(current);
    let lat = latest.trim_start_matches('v');
    cur != lat
}
