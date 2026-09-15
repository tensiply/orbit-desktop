use crate::domain::plugin::{PluginInfo, ScopeArgs};

/// Port: contract for listing, enabling, and disabling orbit plugins,
/// scope-aware per the selected ScopeNavigator path.
pub trait PluginRepository: Send + Sync {
    /// Per-scope enablement status for every plugin. `scope` all-empty → global.
    fn list(&self, scope: &ScopeArgs) -> Vec<PluginInfo>;
    /// Enable the plugin at `level` (`None` → global). `scope` names the concrete
    /// tenant/project/repo the level resolves against.
    fn enable(&self, name: &str, level: Option<&str>, scope: &ScopeArgs) -> Result<(), String>;
    fn disable(&self, name: &str, level: Option<&str>, scope: &ScopeArgs) -> Result<(), String>;
}
