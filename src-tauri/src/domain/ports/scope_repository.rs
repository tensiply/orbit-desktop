use crate::domain::scope::ScopeTreeWorkspace;
use std::path::Path;

/// Port: contract for reading the scope hierarchy from the filesystem.
/// The concrete implementation scans `ai_root/tenants/…` directories.
pub trait ScopeRepository: Send + Sync {
    fn scope_tree(&self) -> Vec<ScopeTreeWorkspace>;

    /// Read the first non-header line from the repository README.md as a description.
    fn read_description(
        &self,
        ai_root: &Path,
        tenant: &str,
        project: &str,
        repository: &str,
    ) -> Option<String>;
}
