use orbit_core::plugin::{load_all, PluginState};

use crate::domain::{plugin::PluginInfo, ports::plugin_repository::PluginRepository};

pub struct OrbitPluginRepo;

impl PluginRepository for OrbitPluginRepo {
    fn list(&self) -> Vec<PluginInfo> {
        let state = PluginState::load();
        load_all()
            .into_iter()
            .map(|p| {
                let installed = p.is_installed();
                let mcp_enabled = !p.mcp.is_empty() && state.is_enabled(&p.name);
                PluginInfo {
                    name: p.name,
                    description: p.description,
                    category: p.category,
                    installed,
                    mcp_enabled,
                }
            })
            .collect()
    }

    fn enable(&self, name: &str) -> Result<(), String> {
        let mut state = PluginState::load();
        state.enable(name);
        state.save().map_err(|e| e.to_string())
    }

    fn disable(&self, name: &str) -> Result<(), String> {
        let mut state = PluginState::load();
        state.disable(name);
        state.save().map_err(|e| e.to_string())
    }
}
