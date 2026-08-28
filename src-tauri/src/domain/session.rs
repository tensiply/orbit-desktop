use serde::{Deserialize, Serialize};

fn is_false(b: &bool) -> bool {
    !b
}

/// Session as returned to the frontend — mirrors orbit_core::session::Session but
/// with `work_dir` as String (PathBuf is not TS-safe) and without internal fields.
#[derive(Debug, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
#[cfg_attr(test, ts(export))]
pub struct SessionDto {
    pub id: String,
    pub pid: u32,
    pub engine: String,
    pub tenant: String,
    pub project: String,
    pub repository: String,
    pub work_dir: String,
    #[cfg_attr(test, ts(type = "number"))]
    pub started_at: u64,
    pub global_mode: bool,
    #[serde(default, skip_serializing_if = "is_false")]
    pub is_history: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[cfg_attr(test, ts(optional))]
    pub tmux_session: Option<String>,
}

/// Input for launching a new session. Received from the frontend as a Tauri command argument.
#[derive(Debug, Serialize, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
#[cfg_attr(test, ts(export))]
pub struct LaunchScope {
    pub workspace: Option<String>,
    pub tenant: Option<String>,
    pub project: Option<String>,
    pub repository: Option<String>,
    pub engine: String,
    pub new_session: bool,
}

/// Result of a successful session launch.
#[derive(Debug, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
#[cfg_attr(test, ts(export))]
pub struct LaunchedInfo {
    pub session_id: String,
    pub tmux_name: String,
}

// ── Harness read model ────────────────────────────────────────────────────────
// These types represent the full inspection report for a scope+engine pair.
// They are read-only projections — no domain logic, no mutations.

#[derive(Debug, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
#[cfg_attr(test, ts(export))]
pub struct HarnessLayer {
    pub path: String,
    pub exists: bool,
    pub label: String,
}

#[derive(Debug, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
#[cfg_attr(test, ts(export))]
pub struct HarnessMcpServer {
    pub name: String,
    pub command: Vec<String>,
    pub source: String,
}

#[derive(Debug, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
#[cfg_attr(test, ts(export))]
pub struct HarnessInstruction {
    pub path: String,
    pub exists: bool,
}

#[derive(Debug, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
#[cfg_attr(test, ts(export))]
pub struct HarnessEnvVar {
    pub key: String,
    pub value: String,
    /// True when the key matches SecretPolicy::is_sensitive — set by the handler, not stored.
    pub redacted: bool,
}

#[derive(Debug, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
#[cfg_attr(test, ts(export))]
pub struct HarnessCommand {
    pub name: String,
    pub source: String,
}

#[derive(Debug, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
#[cfg_attr(test, ts(export))]
pub struct HarnessHook {
    pub name: String,
    pub events: String,
}

#[derive(Debug, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
#[cfg_attr(test, ts(export))]
pub struct HarnessPluginContext {
    pub name: String,
    pub prompt_preview: Option<String>,
    pub instruction_files: Vec<String>,
}

#[derive(Debug, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
#[cfg_attr(test, ts(export))]
pub struct HarnessScopeInfo {
    pub workspace: String,
    pub workspace_root: String,
    pub tenant: String,
    pub project: String,
    pub repository: String,
    pub engine: String,
    pub work_dir: String,
    pub exec_cmd: String,
    pub auth_status: String,
}

#[derive(Debug, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
#[cfg_attr(test, ts(export))]
pub struct HarnessReport {
    pub scope: HarnessScopeInfo,
    pub config_layers: Vec<HarnessLayer>,
    pub mcp_layers: Vec<HarnessLayer>,
    pub agent_overlay_dirs: Vec<HarnessLayer>,
    pub instructions: Vec<HarnessInstruction>,
    pub mcp_servers: Vec<HarnessMcpServer>,
    pub env_vars: Vec<HarnessEnvVar>,
    pub commands: Vec<HarnessCommand>,
    pub engine_hooks: Vec<HarnessHook>,
    pub plugin_context: Vec<HarnessPluginContext>,
    pub activity_preview: Vec<String>,
}
