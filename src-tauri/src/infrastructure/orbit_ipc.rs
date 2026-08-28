use crate::domain::{
    daemon::DaemonStatus,
    errors::DomainError,
    ports::orbit_client::OrbitClient,
    session::{LaunchScope, LaunchedInfo},
};
use orbit_core::session::Session;

/// Concrete implementation of OrbitClient that communicates with orbitd via Unix socket IPC.
/// Stateless — all calls delegate directly to orbit_client::ipc.
pub struct OrbitIpcClient;

#[allow(async_fn_in_trait)]
impl OrbitClient for OrbitIpcClient {
    async fn list_sessions(&self) -> Result<Vec<Session>, DomainError> {
        orbit_client::ipc::list_sessions()
            .await
            .map_err(DomainError::from)
    }

    async fn kill_session(&self, id: &str) -> Result<(), DomainError> {
        orbit_client::ipc::kill_session(id)
            .await
            .map_err(DomainError::from)
    }

    async fn clean_sessions(&self) -> Result<usize, DomainError> {
        orbit_client::ipc::clean_sessions()
            .await
            .map_err(DomainError::from)
    }

    async fn launch_session(&self, scope: &LaunchScope) -> Result<LaunchedInfo, DomainError> {
        orbit_client::ipc::launch_session(
            scope.workspace.clone(),
            scope.tenant.clone(),
            scope.project.clone(),
            scope.repository.clone(),
            &scope.engine,
            false,
            scope.new_session,
        )
        .await
        .map_err(DomainError::from)
        .map(|launched| LaunchedInfo {
            session_id: launched.session_id,
            tmux_name: launched.tmux_name,
        })
    }

    fn is_available(&self) -> bool {
        orbit_client::ipc::is_available()
    }

    async fn daemon_status(&self) -> Result<DaemonStatus, DomainError> {
        orbit_client::ipc::status()
            .await
            .map_err(DomainError::from)
            .map(|info| DaemonStatus {
                running: true,
                uptime_secs: Some(info.uptime_secs),
                session_count: info.session_count,
                pid: Some(info.pid),
            })
    }

    async fn ensure_running(&self) -> Result<(), DomainError> {
        if orbit_client::ipc::is_available() {
            return Ok(());
        }
        let status = tokio::process::Command::new("orbitd")
            .arg("--detach")
            .spawn()
            .map_err(|e| DomainError::Other(format!("failed to spawn orbitd: {e}")))?
            .wait()
            .await
            .map_err(DomainError::from)?;
        if !status.success() {
            tracing::warn!("orbitd exited with status {status}");
        }
        // Give daemon a moment to bind the socket
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
        Ok(())
    }
}
