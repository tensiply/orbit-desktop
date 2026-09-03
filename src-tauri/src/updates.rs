use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::Command;

use crate::domain::ports::workspace_repository::WorkspaceRepository;

// ── Types ──────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct CliInfo {
    pub installed: bool,
    pub version: Option<String>,
    pub path: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct SetupStatus {
    pub cli_installed: bool,
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

/// Detect whether the `orbit` CLI is installed and return its version and path.
#[tauri::command]
pub async fn cli_check() -> Result<CliInfo, String> {
    let path = which_binary("orbit").await;

    let Some(path) = path else {
        return Ok(CliInfo {
            installed: false,
            version: None,
            path: None,
        });
    };

    let version = Command::new(&path)
        .arg("--version")
        .output()
        .await
        .ok()
        .and_then(|o| {
            if o.status.success() {
                String::from_utf8(o.stdout)
                    .ok()
                    .map(|s| s.trim().to_string())
            } else {
                String::from_utf8(o.stderr)
                    .ok()
                    .map(|s| s.trim().to_string())
            }
        });

    Ok(CliInfo {
        installed: true,
        version,
        path: Some(path.to_string_lossy().to_string()),
    })
}

/// Install or update the orbit CLI.
/// `method` is one of: "github" (download pre-built binary), "cargo" (compile from source), "brew".
#[tauri::command]
pub async fn cli_install(method: String, app: AppHandle) -> Result<(), String> {
    match method.as_str() {
        "github" => install_from_github(&app).await,
        "cargo" => install_via_cargo(&app).await,
        "brew" => install_via_brew(&app).await,
        _ => Err(format!("unknown install method: {method}")),
    }
}

/// Return a combined setup status: CLI installed + at least one workspace registered.
#[tauri::command]
pub async fn setup_check(
    workspace_repo: State<'_, Arc<dyn WorkspaceRepository>>,
) -> Result<SetupStatus, String> {
    let cli_installed = which_binary("orbit").await.is_some();
    let has_workspaces = !workspace_repo.list().is_empty();
    Ok(SetupStatus {
        cli_installed,
        has_workspaces,
    })
}

/// Run `orbit workspace add <path> [--name <name>]` and stream output via the
/// `setup_output` Tauri event.
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

    let mut child = Command::new("orbit")
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

/// Check for available updates for the CLI and desktop app via GitHub releases.
/// Returns gracefully when GitHub is unreachable or no releases are published yet.
#[tauri::command]
pub async fn check_updates(app: AppHandle) -> Result<UpdateCheck, String> {
    let desktop_version = app.package_info().version.to_string();

    let cli_info = cli_check().await?;
    let cli_current = cli_info.version.clone();

    let client = build_client(60)?;

    let cli_latest = fetch_latest_github_release(&client, "tensiply", "orbit")
        .await
        .ok();
    let desktop_latest = fetch_latest_github_release(&client, "tensiply", "orbit-desktop")
        .await
        .ok();

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

// ── Install helpers ────────────────────────────────────────────────────────────

async fn install_from_github(app: &AppHandle) -> Result<(), String> {
    let os = std::env::consts::OS;
    let arch = std::env::consts::ARCH;

    let artifact = match (os, arch) {
        ("linux", "x86_64") => "orbit-linux-x86_64",
        ("linux", "aarch64") => "orbit-linux-aarch64",
        ("macos", "x86_64") => "orbit-macos-x86_64",
        ("macos", "aarch64") => "orbit-macos-aarch64",
        _ => return Err(format!("unsupported platform: {os}-{arch}")),
    };

    emit(app, "Fetching latest release info…");

    let client = build_client(60)?;
    let version = fetch_latest_github_release(&client, "tensiply", "orbit")
        .await
        .map_err(|e| format!("failed to fetch release info: {e}"))?;
    let tag = format!("v{version}");
    let url = format!("https://github.com/tensiply/orbit/releases/download/{tag}/{artifact}");

    emit(app, &format!("Downloading {artifact} ({tag})…"));

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("request failed: {e}"))?;

    if response.status() == reqwest::StatusCode::NOT_FOUND {
        return Err(format!(
            "No pre-built binary for {tag}. Use 'Compile from source' to build it locally."
        ));
    }
    if !response.status().is_success() {
        return Err(format!("download failed: HTTP {}", response.status()));
    }

    let content_length = response.content_length();
    let tmp_path = std::env::temp_dir().join(artifact);

    let mut file = tokio::fs::File::create(&tmp_path)
        .await
        .map_err(|e| format!("cannot create temp file: {e}"))?;

    let mut downloaded = 0u64;
    let mut last_pct = 0u64;
    let mut response = response;

    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|e| format!("download error: {e}"))?
    {
        file.write_all(&chunk)
            .await
            .map_err(|e| format!("write error: {e}"))?;
        downloaded += chunk.len() as u64;

        if let Some(total) = content_length {
            let pct = downloaded * 100 / total;
            // Emit at most once per 5%
            if pct >= last_pct + 5 || pct == 100 {
                emit(
                    app,
                    &format!("  {}% ({} / {} MB)", pct, mb(downloaded), mb(total)),
                );
                last_pct = pct;
            }
        }
    }

    file.flush().await.map_err(|e| e.to_string())?;
    drop(file);

    emit(app, &format!("Downloaded {} MB", mb(downloaded)));

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        tokio::fs::set_permissions(&tmp_path, std::fs::Permissions::from_mode(0o755))
            .await
            .map_err(|e| format!("chmod failed: {e}"))?;
    }

    let install_path = resolve_install_path().await;

    if let Some(parent) = install_path.parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(|e| format!("cannot create {}: {e}", parent.display()))?;
    }

    emit(app, &format!("Installing to {}…", install_path.display()));

    // Atomic rename; fall back to copy+delete across filesystems
    if tokio::fs::rename(&tmp_path, &install_path).await.is_err() {
        tokio::fs::copy(&tmp_path, &install_path)
            .await
            .map_err(|e| format!("install failed: {e}"))?;
        let _ = tokio::fs::remove_file(&tmp_path).await;
    }

    emit(app, &format!("orbit {tag} installed successfully."));

    Ok(())
}

async fn install_via_brew(app: &AppHandle) -> Result<(), String> {
    use std::process::Stdio;
    let mut child = Command::new("brew")
        .args(["install", "tensiply/tap/orbit"])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("failed to start brew: {e}"))?;

    let stderr = child.stderr.take().expect("stderr piped");
    let app_err = app.clone();
    tokio::spawn(async move {
        let mut reader = BufReader::new(stderr).lines();
        while let Ok(Some(line)) = reader.next_line().await {
            let _ = app_err.emit("cli_install_output", &line);
        }
    });

    let stdout = child.stdout.take().expect("stdout piped");
    let mut reader = BufReader::new(stdout).lines();
    while let Ok(Some(line)) = reader.next_line().await {
        let _ = app.emit("cli_install_output", &line);
    }

    let status = child.wait().await.map_err(|e| e.to_string())?;
    if !status.success() {
        return Err(format!(
            "brew exited with status {}",
            status.code().unwrap_or(-1)
        ));
    }

    Ok(())
}

async fn install_via_cargo(app: &AppHandle) -> Result<(), String> {
    use std::process::Stdio;
    emit(
        app,
        "Building orbit from source (this may take several minutes)…",
    );

    let mut child = Command::new("cargo")
        .args([
            "install",
            "--git",
            "https://github.com/tensiply/orbit",
            "orbit",
            "--locked",
        ])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("failed to start cargo: {e}"))?;

    let stderr = child.stderr.take().expect("stderr piped");
    let app_err = app.clone();
    tokio::spawn(async move {
        let mut reader = BufReader::new(stderr).lines();
        while let Ok(Some(line)) = reader.next_line().await {
            let _ = app_err.emit("cli_install_output", &line);
        }
    });

    let stdout = child.stdout.take().expect("stdout piped");
    let mut reader = BufReader::new(stdout).lines();
    while let Ok(Some(line)) = reader.next_line().await {
        let _ = app.emit("cli_install_output", &line);
    }

    let status = child.wait().await.map_err(|e| e.to_string())?;
    if !status.success() {
        return Err(format!(
            "cargo exited with status {}",
            status.code().unwrap_or(-1)
        ));
    }

    Ok(())
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async fn resolve_install_path() -> PathBuf {
    // Replace the existing binary if it's writable; otherwise use ~/.local/bin
    if let Some(existing) = which_binary("orbit").await {
        if std::fs::OpenOptions::new()
            .write(true)
            .create(false)
            .open(&existing)
            .is_ok()
        {
            return existing;
        }
    }
    let home = std::env::var("HOME").unwrap_or_default();
    PathBuf::from(home).join(".local").join("bin").join("orbit")
}

async fn which_binary(bin: &str) -> Option<PathBuf> {
    #[cfg(windows)]
    let finder = "where";
    #[cfg(not(windows))]
    let finder = "which";

    let out = Command::new(finder).arg(bin).output().await.ok()?;
    if !out.status.success() {
        return None;
    }
    let path = String::from_utf8(out.stdout).ok()?;
    Some(PathBuf::from(path.trim()))
}

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

fn emit(app: &AppHandle, msg: &str) {
    let _ = app.emit("cli_install_output", msg);
}

fn mb(bytes: u64) -> String {
    format!("{:.1}", bytes as f64 / 1_048_576.0)
}
