use tauri::State;

use crate::domain::{daemon::DaemonStatus, ports::orbit_client::OrbitClient};
use crate::infrastructure::orbit_ipc::OrbitIpcClient;

#[tauri::command]
pub async fn daemon_status(client: State<'_, OrbitIpcClient>) -> Result<DaemonStatus, String> {
    if !client.is_available() {
        return Ok(DaemonStatus {
            running: false,
            uptime_secs: None,
            session_count: 0,
            pid: None,
        });
    }
    client.daemon_status().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn daemon_ensure_running(client: State<'_, OrbitIpcClient>) -> Result<(), String> {
    client.ensure_running().await.map_err(|e| e.to_string())
}
