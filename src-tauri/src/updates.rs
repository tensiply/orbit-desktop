use serde::{Deserialize, Serialize};
use std::process::Stdio;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

// ── Types ──────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct CliInfo {
    pub installed: bool,
    pub version: Option<String>,
    pub path: Option<String>,
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

/// Detect whether the `orbit` CLI is installed and return its version and path.
#[tauri::command]
pub async fn cli_check() -> Result<CliInfo, String> {
    let path = which_binary("orbit").await;

    let Some(path) = path else {
        return Ok(CliInfo { installed: false, version: None, path: None });
    };

    let version = Command::new(&path)
        .arg("--version")
        .output()
        .await
        .ok()
        .and_then(|o| {
            if o.status.success() {
                String::from_utf8(o.stdout).ok().map(|s| s.trim().to_string())
            } else {
                // Some CLIs print version to stderr
                String::from_utf8(o.stderr).ok().map(|s| s.trim().to_string())
            }
        });

    Ok(CliInfo {
        installed: true,
        version,
        path: Some(path.to_string_lossy().to_string()),
    })
}

/// Run the orbit CLI install process and stream output lines via "cli_install_output" events.
/// `method` is one of: "cargo", "brew".
#[tauri::command]
pub async fn cli_install(method: String, app: AppHandle) -> Result<(), String> {
    let (bin, args): (&str, Vec<&str>) = match method.as_str() {
        "cargo" => ("cargo", vec!["install", "orbit", "--locked"]),
        "brew" => ("brew", vec!["install", "tensiply/tap/orbit"]),
        _ => return Err(format!("unknown install method: {method}")),
    };

    let mut child = Command::new(bin)
        .args(&args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("failed to start {bin}: {e}"))?;

    let stdout = child.stdout.take().expect("stdout piped");
    let stderr = child.stderr.take().expect("stderr piped");

    // Stream stderr (cargo writes progress there)
    let app_err = app.clone();
    tokio::spawn(async move {
        let mut reader = BufReader::new(stderr).lines();
        while let Ok(Some(line)) = reader.next_line().await {
            let _ = app_err.emit("cli_install_output", &line);
        }
    });

    // Stream stdout
    let mut reader = BufReader::new(stdout).lines();
    while let Ok(Some(line)) = reader.next_line().await {
        let _ = app.emit("cli_install_output", &line);
    }

    let status = child.wait().await.map_err(|e| e.to_string())?;
    if !status.success() {
        return Err(format!(
            "{bin} exited with status {}",
            status.code().unwrap_or(-1)
        ));
    }

    Ok(())
}

/// Check for available updates for the CLI and desktop app via GitHub releases.
/// Returns gracefully when GitHub is unreachable or no releases are published yet.
#[tauri::command]
pub async fn check_updates(app: AppHandle) -> Result<UpdateCheck, String> {
    let desktop_version = app.package_info().version.to_string();

    let cli_info = cli_check().await?;
    let cli_current = cli_info.version.clone();

    let client = reqwest::Client::builder()
        .user_agent("orbit-desktop")
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let cli_latest =
        fetch_latest_github_release(&client, "tensiply", "orbit").await.ok();
    let desktop_latest =
        fetch_latest_github_release(&client, "tensiply", "orbit-desktop").await.ok();

    let cli_has_update = match (&cli_current, &cli_latest) {
        (Some(cur), Some(lat)) => is_older(cur, lat),
        _ => false,
    };
    let desktop_has_update = match &desktop_latest {
        Some(lat) => is_older(&desktop_version, lat),
        None => false,
    };

    Ok(UpdateCheck {
        cli: ComponentUpdate {
            current: cli_current,
            latest: cli_latest,
            has_update: cli_has_update,
        },
        desktop: ComponentUpdate {
            current: Some(desktop_version),
            latest: desktop_latest,
            has_update: desktop_has_update,
        },
    })
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async fn which_binary(bin: &str) -> Option<std::path::PathBuf> {
    // `which` on Unix, `where` on Windows
    #[cfg(windows)]
    let finder = "where";
    #[cfg(not(windows))]
    let finder = "which";

    let out = Command::new(finder).arg(bin).output().await.ok()?;
    if !out.status.success() {
        return None;
    }
    let path = String::from_utf8(out.stdout).ok()?;
    Some(std::path::PathBuf::from(path.trim()))
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
    // Strip leading 'v' and trailing noise (e.g. "orbit 1.2.3" → "1.2.3")
    let cur = current
        .trim_start_matches('v')
        .split_whitespace()
        .last()
        .unwrap_or(current);
    let lat = latest.trim_start_matches('v');
    cur != lat
}
