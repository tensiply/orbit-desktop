use std::sync::Arc;
use tauri::State;

use crate::domain::plugin::PluginInfo;
use crate::domain::ports::plugin_repository::PluginRepository;

#[tauri::command]
pub async fn plugin_list(
    repo: State<'_, Arc<dyn PluginRepository>>,
) -> Result<Vec<PluginInfo>, String> {
    let repo = Arc::clone(&*repo);
    tokio::task::spawn_blocking(move || repo.list())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn plugin_enable(
    name: String,
    _scope: String,
    repo: State<'_, Arc<dyn PluginRepository>>,
) -> Result<(), String> {
    let repo = Arc::clone(&*repo);
    tokio::task::spawn_blocking(move || repo.enable(&name))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn plugin_disable(
    name: String,
    _scope: String,
    repo: State<'_, Arc<dyn PluginRepository>>,
) -> Result<(), String> {
    let repo = Arc::clone(&*repo);
    tokio::task::spawn_blocking(move || repo.disable(&name))
        .await
        .map_err(|e| e.to_string())?
}
