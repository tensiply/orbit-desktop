use orbit_core::session::Session;
use std::io::{BufRead, BufReader};
use std::sync::Arc;
use std::time::{Instant, UNIX_EPOCH};
use tauri::State;

use crate::command_recorder::CommandRecorder;
use crate::domain::ports::harness_inspector::HarnessInspector;
use crate::domain::ports::orbit_client::OrbitClient;
use crate::domain::session::{HarnessReport, LaunchScope, LaunchedInfo};
use crate::infrastructure::orbit_ipc::OrbitIpcClient;

#[tauri::command]
pub async fn session_list(client: State<'_, OrbitIpcClient>) -> Result<Vec<Session>, String> {
    client.list_sessions().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn session_kill(
    id: String,
    client: State<'_, OrbitIpcClient>,
    recorder: State<'_, CommandRecorder>,
) -> Result<(), String> {
    let t = Instant::now();
    let result = client.kill_session(&id).await;
    let ms = t.elapsed().as_millis() as u64;
    match &result {
        Ok(_) => recorder.record("session_kill", &id, ms, true, None),
        Err(e) => recorder.record("session_kill", &id, ms, false, Some(&e.to_string())),
    }
    result.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn session_clean(client: State<'_, OrbitIpcClient>) -> Result<usize, String> {
    client.clean_sessions().await.map_err(|e| e.to_string())
}

/// Read the Claude Code `ai-title` for the session whose working directory is `work_dir`.
/// Maps work_dir → `~/.claude/projects/<hash>/` and scans JSONL files by most recently modified.
#[tauri::command]
pub async fn get_session_title(work_dir: String, started_at: u64) -> Option<String> {
    let _ = started_at; // kept in signature for API compat; mtime filter removed (timing is unreliable)
    let home = std::env::var("HOME").ok()?;
    // Claude hashes the cwd by replacing '/' with '-' (keeping the leading '-')
    let hash = work_dir.replace('/', "-");
    let projects_dir = std::path::PathBuf::from(&home)
        .join(".claude/projects")
        .join(&hash);
    if !projects_dir.exists() {
        return None;
    }

    let mut candidates: Vec<(u64, std::path::PathBuf)> = std::fs::read_dir(&projects_dir)
        .ok()?
        .filter_map(|e| e.ok())
        .filter(|e| e.path().extension().is_some_and(|x| x == "jsonl"))
        .filter_map(|e| {
            let mtime = e
                .metadata()
                .ok()?
                .modified()
                .ok()?
                .duration_since(UNIX_EPOCH)
                .ok()?
                .as_secs();
            Some((mtime, e.path()))
        })
        .collect();

    // Most recently modified first → most likely current session
    candidates.sort_by_key(|c| std::cmp::Reverse(c.0));

    // ai-title is written asynchronously after the first response — scan the full file
    // and keep the last occurrence (Claude Code updates it as conversation continues).
    for (_, path) in candidates {
        if let Ok(f) = std::fs::File::open(&path) {
            let mut last_title: Option<String> = None;
            for line in BufReader::new(f).lines().map_while(Result::ok) {
                if let Ok(obj) = serde_json::from_str::<serde_json::Value>(&line) {
                    if obj.get("type").and_then(|t| t.as_str()) == Some("ai-title") {
                        if let Some(title) = obj.get("aiTitle").and_then(|t| t.as_str()) {
                            last_title = Some(title.to_string());
                        }
                    }
                }
            }
            if last_title.is_some() {
                return last_title;
            }
        }
    }
    None
}

#[tauri::command]
pub async fn session_launch(
    scope: LaunchScope,
    client: State<'_, OrbitIpcClient>,
    recorder: State<'_, CommandRecorder>,
) -> Result<LaunchedInfo, String> {
    let summary = format!(
        "{}/{}",
        scope.tenant.as_deref().unwrap_or("_"),
        scope.engine
    );
    let t = Instant::now();
    let result = client.launch_session(&scope).await;
    let ms = t.elapsed().as_millis() as u64;
    match &result {
        Ok(_) => recorder.record("session_launch", &summary, ms, true, None),
        Err(e) => recorder.record("session_launch", &summary, ms, false, Some(&e.to_string())),
    }
    result.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn session_harness(
    workspace: Option<String>,
    tenant: Option<String>,
    project: Option<String>,
    repository: Option<String>,
    engine: String,
    inspector: State<'_, Arc<dyn HarnessInspector>>,
    recorder: State<'_, CommandRecorder>,
) -> Result<HarnessReport, String> {
    let t = Instant::now();
    let result = inspector.inspect(workspace, tenant, project, repository, engine.clone());
    let ms = t.elapsed().as_millis() as u64;
    match &result {
        Ok(_) => recorder.record("session_harness", &engine, ms, true, None),
        Err(e) => recorder.record("session_harness", &engine, ms, false, Some(&e.to_string())),
    }
    result.map_err(|e| e.to_string())
}
