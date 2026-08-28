use serde::Serialize;

/// Workspace entry as returned to the frontend for workspace switching.
#[derive(Debug, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
#[cfg_attr(test, ts(export))]
pub struct WorkspaceInfo {
    pub name: String,
    pub slug: String,
    pub is_default: bool,
}
