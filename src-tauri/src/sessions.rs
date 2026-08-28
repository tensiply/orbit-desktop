use orbit_core::session::Session;
use std::sync::Arc;
use std::time::Instant;
use tauri::State;

use crate::command_recorder::CommandRecorder;
use crate::domain::ports::harness_inspector::HarnessInspector;
use crate::domain::ports::orbit_client::OrbitClient;
use crate::domain::ports::session_title_reader::SessionTitleReader;
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

#[tauri::command]
pub async fn get_session_title(
    work_dir: String,
    started_at: u64,
    reader: State<'_, Arc<dyn SessionTitleReader>>,
) -> Result<Option<String>, String> {
    let _ = started_at;
    let reader = Arc::clone(&*reader);
    tokio::task::spawn_blocking(move || reader.read_title(&work_dir))
        .await
        .map_err(|e| e.to_string())
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
