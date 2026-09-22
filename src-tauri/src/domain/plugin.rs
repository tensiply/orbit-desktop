use serde::{Deserialize, Serialize};

/// Plugin registry entry as returned to the frontend, with scope-aware
/// enablement status derived from the selected scope's MCP layers (ADR-014).
#[derive(Debug, Serialize, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
#[cfg_attr(test, ts(export))]
pub struct PluginInfo {
    pub name: String,
    pub description: String,
    pub category: String,
    pub installed: bool,
    /// Whether the plugin ships an MCP server at all (independent of enablement).
    pub has_mcp: bool,
    /// Scope level whose own `mcp.json` holds this plugin's entries (deepest
    /// match): `"global" | "workspace" | "tenant" | "project" | "repository"`.
    /// `None` when the plugin is not enabled anywhere along the scope chain.
    pub enabled_here: Option<String>,
    /// Whether the plugin is effectively active in the selected scope — enabled
    /// here or inherited from an ancestor level (or the global plugin file).
    pub enabled_effective: bool,
}

/// Scope selector from the desktop's ScopeNavigator. Empty fields mean "not
/// drilled to that level"; all-empty resolves to the global/cwd scope.
#[derive(Debug, Default, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
#[cfg_attr(test, ts(export))]
pub struct ScopeArgs {
    pub workspace: Option<String>,
    pub tenant: Option<String>,
    pub project: Option<String>,
    pub repository: Option<String>,
}
