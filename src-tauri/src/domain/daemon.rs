use serde::Serialize;

/// Snapshot of the orbitd daemon process state.
#[derive(Debug, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
#[cfg_attr(test, ts(export))]
pub struct DaemonStatus {
    pub running: bool,
    #[cfg_attr(test, ts(type = "number | null"))]
    pub uptime_secs: Option<u64>,
    pub session_count: usize,
    pub pid: Option<u32>,
}
