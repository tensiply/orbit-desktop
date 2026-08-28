use orbit_core::plugin::{load_all, PluginState};

use crate::domain::plugin::PluginInfo;

#[tauri::command]
pub async fn plugin_list() -> Result<Vec<PluginInfo>, String> {
    tokio::task::spawn_blocking(|| {
        let state = PluginState::load();
        let infos = load_all()
            .into_iter()
            .map(|p| {
                let installed = p.is_installed();
                let mcp_enabled = !p.mcp.is_empty() && state.is_enabled(&p.name);
                PluginInfo {
                    name: p.name,
                    description: p.description,
                    category: p.category,
                    installed,
                    mcp_enabled,
                }
            })
            .collect();
        Ok(infos)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn plugin_enable(name: String, _scope: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let mut state = PluginState::load();
        state.enable(&name);
        state.save().map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn plugin_disable(name: String, _scope: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let mut state = PluginState::load();
        state.disable(&name);
        state.save().map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}
