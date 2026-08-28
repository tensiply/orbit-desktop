use crate::domain::plugin::PluginInfo;

/// Port: contract for listing, enabling, and disabling orbit plugins.
pub trait PluginRepository: Send + Sync {
    fn list(&self) -> Vec<PluginInfo>;
    fn enable(&self, name: &str) -> Result<(), String>;
    fn disable(&self, name: &str) -> Result<(), String>;
}
