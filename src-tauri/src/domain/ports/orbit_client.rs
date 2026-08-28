use crate::domain::{
    daemon::DaemonStatus,
    errors::DomainError,
    session::{LaunchScope, LaunchedInfo},
};
use orbit_core::session::Session;

/// Port: contract that the application layer uses to communicate with the orbit daemon (orbitd).
/// The concrete implementation lives in infrastructure and calls `orbit_client::ipc` directly.
///
/// Using `#[allow(async_fn_in_trait)]` because we don't need the Send-bound complexity of
/// async-trait — all current callers are Tauri command handlers running on tokio.
#[allow(async_fn_in_trait)]
pub trait OrbitClient: Send + Sync {
    async fn list_sessions(&self) -> Result<Vec<Session>, DomainError>;
    async fn kill_session(&self, id: &str) -> Result<(), DomainError>;
    async fn clean_sessions(&self) -> Result<usize, DomainError>;
    async fn launch_session(&self, scope: &LaunchScope) -> Result<LaunchedInfo, DomainError>;

    /// Fast check — does not make a network/socket call.
    fn is_available(&self) -> bool;
    async fn daemon_status(&self) -> Result<DaemonStatus, DomainError>;
    async fn ensure_running(&self) -> Result<(), DomainError>;
}
