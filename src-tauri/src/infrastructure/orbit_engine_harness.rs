use orbit_core::engine::Engine;
use std::path::Path;

use crate::domain::{
    errors::DomainError,
    harness::SecretPolicy,
    ports::harness_inspector::HarnessInspector,
    session::{
        HarnessCommand, HarnessEnvVar, HarnessHook, HarnessInstruction, HarnessLayer,
        HarnessMcpServer, HarnessPluginContext, HarnessReport, HarnessScopeInfo,
    },
};

pub struct OrbitEngineHarness;

fn shorten_home(home: &Path, p: &Path) -> String {
    if let Ok(rel) = p.strip_prefix(home) {
        format!("~/{}", rel.display())
    } else {
        p.to_string_lossy().into_owned()
    }
}

impl HarnessInspector for OrbitEngineHarness {
    fn inspect(
        &self,
        workspace: Option<String>,
        tenant: Option<String>,
        project: Option<String>,
        repository: Option<String>,
        engine: String,
    ) -> Result<HarnessReport, DomainError> {
        let eng: Engine = engine
            .parse()
            .map_err(|_| DomainError::InvalidInput(format!("unknown engine: {engine}")))?;

        let scope = orbit_engine::resolver::resolve(orbit_core::resolver::ResolveArgs {
            workspace,
            tenant,
            project,
            repository,
        })
        .map_err(|e| DomainError::Other(e.to_string()))?;

        let (_merged, report) = orbit_engine::config::inspect(&scope, eng)
            .map_err(|e| DomainError::Other(e.to_string()))?;

        let home = directories::BaseDirs::new()
            .map(|b| b.home_dir().to_path_buf())
            .unwrap_or_else(|| std::path::PathBuf::from("/"));

        let config_file = orbit_engine::launcher::runtime::config_file_path(&scope, eng);
        let context_file = orbit_engine::launcher::runtime::context_file_path(&scope, eng);

        let exec_cmd = match eng {
            Engine::Claude => {
                let ctx = context_file
                    .as_ref()
                    .map(|p| format!(" --append-system-prompt-file {}", shorten_home(&home, p)))
                    .unwrap_or_default();
                let hook_state = orbit_core::engine_hook::EngineHookState::load();
                let catalog = orbit_core::engine_hook::load_all();
                let hooks_suffix =
                    if orbit_engine::launcher::engine_hooks::build_settings(&hook_state, &catalog)
                        .is_some()
                    {
                        let hooks_path = orbit_engine::launcher::runtime::runtime_dir_for_slug(
                            &scope,
                            Engine::Claude.as_str(),
                        )
                        .join("claude-hooks-settings.json");
                        format!(" --settings {}", shorten_home(&home, &hooks_path))
                    } else {
                        String::new()
                    };
                format!(
                    "claude --mcp-config {}{}{}",
                    shorten_home(&home, &config_file),
                    ctx,
                    hooks_suffix
                )
            }
            Engine::Opencode => format!(
                "OPENCODE_CONFIG={} opencode",
                shorten_home(&home, &config_file)
            ),
            Engine::Gemini => format!(
                "GEMINI_CLI_SYSTEM_SETTINGS_PATH={} gemini",
                shorten_home(&home, &config_file)
            ),
        };

        let opencode_ws =
            orbit_engine::launcher::runtime::workspace_runtime_dir_for_slug(&scope, "opencode");
        let auth_status = if opencode_ws
            .join("data")
            .join("opencode")
            .join("auth.json")
            .exists()
        {
            "github-copilot ✓".to_string()
        } else if opencode_ws
            .join("config")
            .join("gh")
            .join("hosts.yml")
            .exists()
        {
            "github ✓".to_string()
        } else {
            "not configured".to_string()
        };

        let workspace_name = scope
            .workspace_root
            .file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_default();

        let plugin_state = orbit_core::plugin::PluginState::load();
        let plugins = orbit_core::plugin::load_all();
        let plugin_context: Vec<HarnessPluginContext> = plugins
            .iter()
            .filter(|p| plugin_state.is_enabled(&p.name))
            .filter_map(|p| {
                let ctx = p.context.as_ref()?;
                let prompt_preview = ctx.prompt.as_ref().map(|s| {
                    let max = 120;
                    if s.len() > max {
                        format!("{}…", &s[..max])
                    } else {
                        s.clone()
                    }
                });
                Some(HarnessPluginContext {
                    name: p.name.clone(),
                    prompt_preview,
                    instruction_files: ctx.instructions.clone(),
                })
            })
            .collect();

        let activity_scope = orbit_core::activity::scope_key(
            if scope.tenant.is_empty() {
                None
            } else {
                Some(scope.tenant.as_str())
            },
            if scope.project.is_empty() {
                None
            } else {
                Some(scope.project.as_str())
            },
            if scope.repository.is_empty() {
                None
            } else {
                Some(scope.repository.as_str())
            },
        );
        let activity_preview: Vec<String> = if activity_scope.is_empty() {
            vec![]
        } else {
            orbit_core::activity::list(Some(&workspace_name), Some(&activity_scope), None, 5)
                .unwrap_or_default()
                .into_iter()
                .map(|e| format!("[{}] {}", e.ts, e.summary))
                .collect()
        };

        Ok(HarnessReport {
            scope: HarnessScopeInfo {
                workspace: workspace_name,
                workspace_root: shorten_home(&home, &scope.workspace_root),
                tenant: scope.tenant.clone(),
                project: scope.project.clone(),
                repository: scope.repository.clone(),
                engine: eng.as_str().to_string(),
                work_dir: shorten_home(&home, &scope.work_dir),
                exec_cmd,
                auth_status,
            },
            config_layers: report
                .config_layers
                .iter()
                .map(|e| HarnessLayer {
                    path: e.path.to_string_lossy().into_owned(),
                    exists: e.exists,
                    label: e.label.clone(),
                })
                .collect(),
            mcp_layers: report
                .mcp_layers
                .iter()
                .map(|e| HarnessLayer {
                    path: e.path.to_string_lossy().into_owned(),
                    exists: e.exists,
                    label: e.label.clone(),
                })
                .collect(),
            agent_overlay_dirs: report
                .agent_overlay_dirs
                .iter()
                .map(|e| HarnessLayer {
                    path: e.path.to_string_lossy().into_owned(),
                    exists: e.exists,
                    label: e.label.clone(),
                })
                .collect(),
            instructions: report
                .instructions
                .iter()
                .map(|(p, e)| HarnessInstruction {
                    path: p.to_string_lossy().into_owned(),
                    exists: *e,
                })
                .collect(),
            mcp_servers: report
                .mcp_servers
                .iter()
                .map(|(name, cmd, source)| HarnessMcpServer {
                    name: name.clone(),
                    command: cmd.clone(),
                    source: source.clone(),
                })
                .collect(),
            env_vars: report
                .env_vars
                .iter()
                .map(|(k, v)| HarnessEnvVar {
                    redacted: SecretPolicy::is_sensitive(k),
                    key: k.clone(),
                    value: v.clone(),
                })
                .collect(),
            commands: report
                .commands
                .iter()
                .map(|(n, s)| HarnessCommand {
                    name: n.clone(),
                    source: s.clone(),
                })
                .collect(),
            engine_hooks: report
                .engine_hooks
                .iter()
                .map(|(n, e)| HarnessHook {
                    name: n.clone(),
                    events: e.clone(),
                })
                .collect(),
            plugin_context,
            activity_preview,
        })
    }
}
