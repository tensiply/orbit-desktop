use std::collections::HashMap;
use std::process::Command;

use orbit_core::plugin::load_all;
use orbit_core::resolver::ResolveArgs;

use crate::domain::{
    plugin::{PluginInfo, ScopeArgs},
    ports::plugin_repository::PluginRepository,
};
use crate::infrastructure::orbit_sidecar::orbit_program;

pub struct OrbitPluginRepo;

impl OrbitPluginRepo {
    fn resolve_args(scope: &ScopeArgs) -> ResolveArgs {
        ResolveArgs {
            workspace: scope.workspace.clone(),
            tenant: scope.tenant.clone(),
            project: scope.project.clone(),
            repository: scope.repository.clone(),
        }
    }

    /// Shell out to `orbit plugins <action> <name> [--scope <level>]`.
    /// The write path (scope-targeted `mcp.json` edits) lives only in orbit-cli
    /// (ADR-014), so we invoke it from the scope's code dir — that is how the CLI
    /// resolves which concrete tenant/project/repo the level applies to.
    fn run_plugins_cmd(
        action: &str,
        name: &str,
        level: Option<&str>,
        scope: &ScopeArgs,
    ) -> Result<(), String> {
        let mut cmd = Command::new(orbit_program());
        cmd.arg("plugins").arg(action).arg(name);
        if let Some(level) = level {
            cmd.arg("--scope").arg(level);
        }
        if let Ok(resolved) = orbit_engine::resolver::resolve(Self::resolve_args(scope)) {
            if resolved.work_dir.is_dir() {
                cmd.current_dir(&resolved.work_dir);
            }
        }
        let out = cmd
            .output()
            .map_err(|e| format!("failed to run orbit plugins {action}: {e}"))?;
        if out.status.success() {
            Ok(())
        } else {
            Err(String::from_utf8_lossy(&out.stderr).trim().to_string())
        }
    }
}

impl PluginRepository for OrbitPluginRepo {
    fn list(&self, scope: &ScopeArgs) -> Vec<PluginInfo> {
        let Ok(orbit_scope) = orbit_engine::resolver::resolve(Self::resolve_args(scope)) else {
            return Vec::new();
        };
        let statuses = orbit_engine::plugin_status::plugin_status_for_scope(&orbit_scope);

        // The engine status carries no catalog metadata — enrich from load_all().
        let meta: HashMap<String, (String, String, bool)> = load_all()
            .into_iter()
            .map(|p| {
                let installed = p.is_installed();
                (p.name, (p.description, p.category, installed))
            })
            .collect();

        statuses
            .into_iter()
            .map(|s| {
                let (description, category, installed) =
                    meta.get(&s.name).cloned().unwrap_or_default();
                PluginInfo {
                    name: s.name,
                    description,
                    category,
                    installed,
                    has_mcp: s.has_mcp,
                    enabled_here: s.enabled_here.map(|l| l.as_str().to_string()),
                    enabled_effective: s.enabled_effective,
                }
            })
            .collect()
    }

    fn enable(&self, name: &str, level: Option<&str>, scope: &ScopeArgs) -> Result<(), String> {
        Self::run_plugins_cmd("enable", name, level, scope)
    }

    fn disable(&self, name: &str, level: Option<&str>, scope: &ScopeArgs) -> Result<(), String> {
        Self::run_plugins_cmd("disable", name, level, scope)
    }

    fn install(&self, name: &str) -> Result<(), String> {
        // Install is global (the tool binary) — no scope. `--yes` picks the best
        // available method non-interactively.
        let out = Command::new(orbit_program())
            .args(["plugins", "install", name, "--yes"])
            .output()
            .map_err(|e| format!("failed to run orbit plugins install: {e}"))?;
        if out.status.success() {
            Ok(())
        } else {
            Err(String::from_utf8_lossy(&out.stderr).trim().to_string())
        }
    }
}
