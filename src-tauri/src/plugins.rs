use std::sync::Arc;
use tauri::State;

use crate::domain::plugin::{PluginInfo, ScopeArgs};
use crate::domain::ports::plugin_repository::PluginRepository;

#[tauri::command]
pub async fn plugin_list(
    scope: ScopeArgs,
    repo: State<'_, Arc<dyn PluginRepository>>,
) -> Result<Vec<PluginInfo>, String> {
    let repo = Arc::clone(&*repo);
    tokio::task::spawn_blocking(move || repo.list(&scope))
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn plugin_enable(
    name: String,
    level: Option<String>,
    scope: ScopeArgs,
    repo: State<'_, Arc<dyn PluginRepository>>,
) -> Result<(), String> {
    let repo = Arc::clone(&*repo);
    tokio::task::spawn_blocking(move || repo.enable(&name, level.as_deref(), &scope))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn plugin_disable(
    name: String,
    level: Option<String>,
    scope: ScopeArgs,
    repo: State<'_, Arc<dyn PluginRepository>>,
) -> Result<(), String> {
    let repo = Arc::clone(&*repo);
    tokio::task::spawn_blocking(move || repo.disable(&name, level.as_deref(), &scope))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn plugin_install(
    name: String,
    repo: State<'_, Arc<dyn PluginRepository>>,
) -> Result<(), String> {
    let repo = Arc::clone(&*repo);
    tokio::task::spawn_blocking(move || repo.install(&name))
        .await
        .map_err(|e| e.to_string())?
}
