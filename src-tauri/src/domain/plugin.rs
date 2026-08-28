use serde::{Deserialize, Serialize};

/// Plugin registry entry as returned to the frontend.
/// Populated by shelling out to `orbit plugins list --json` (Phase 3: direct orbit-core).
#[derive(Debug, Serialize, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
#[cfg_attr(test, ts(export))]
pub struct PluginInfo {
    pub name: String,
    pub description: String,
    pub category: String,
    pub installed: bool,
    pub mcp_enabled: bool,
}
