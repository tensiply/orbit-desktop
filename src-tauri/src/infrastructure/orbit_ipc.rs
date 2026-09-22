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

impl OrbitIpcClient {
    /// (Re)start the channel's daemon via its CLI. `daemon start` is idempotent
    /// and cleans up a stale socket, so it is safe to call on demand.
    async fn start_daemon(&self) -> Result<(), DomainError> {
        let orbit = crate::infrastructure::orbit_sidecar::orbit_program();
        let status = tokio::process::Command::new(&orbit)
            .args(["daemon", "start"])
            .spawn()
            .map_err(|e| DomainError::Other(format!("failed to start orbit daemon: {e}")))?
            .wait()
            .await
            .map_err(DomainError::from)?;
        if !status.success() {
            tracing::warn!("orbit daemon start exited with status {status}");
        }
        // Give the daemon a moment to bind the socket.
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
        Ok(())
    }
}

#[allow(async_fn_in_trait)]
impl OrbitClient for OrbitIpcClient {
    async fn list_sessions(&self) -> Result<Vec<Session>, DomainError> {
        match orbit_client::ipc::list_sessions().await {
            Ok(sessions) => Ok(sessions),
            // The daemon may have died since launch — restart it and retry once
            // so the UI self-heals instead of showing "daemon not running".
            Err(_) => {
                self.start_daemon().await?;
                orbit_client::ipc::list_sessions()
                    .await
                    .map_err(DomainError::from)
            }
        }
    }

    async fn kill_session(&self, id: &str) -> Result<(), DomainError> {
        match orbit_client::ipc::kill_session(id).await {
            Ok(()) => Ok(()),
            Err(_) => {
                self.start_daemon().await?;
                orbit_client::ipc::kill_session(id)
                    .await
                    .map_err(DomainError::from)
            }
        }
    }

    async fn clean_sessions(&self) -> Result<usize, DomainError> {
        match orbit_client::ipc::clean_sessions().await {
            Ok(n) => Ok(n),
            Err(_) => {
                self.start_daemon().await?;
                orbit_client::ipc::clean_sessions()
                    .await
                    .map_err(DomainError::from)
            }
        }
    }

    async fn launch_session(&self, scope: &LaunchScope) -> Result<LaunchedInfo, DomainError> {
        let call = || {
            orbit_client::ipc::launch_session(
                scope.workspace.clone(),
                scope.tenant.clone(),
                scope.project.clone(),
                scope.repository.clone(),
                &scope.engine,
                false,
                scope.new_session,
            )
        };
        let launched = match call().await {
            Ok(launched) => launched,
            Err(_) => {
                self.start_daemon().await?;
                call().await.map_err(DomainError::from)?
            }
        };
        Ok(LaunchedInfo {
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
        // Real liveness check: a stale socket file must not fool us into thinking
        // the daemon is up. `status()` does an actual IPC round-trip.
        if orbit_client::ipc::status().await.is_ok() {
            return Ok(());
        }
        self.start_daemon().await
    }
}
