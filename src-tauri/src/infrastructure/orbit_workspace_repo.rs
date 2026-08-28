use orbit_core::workspace_registry::WorkspaceRegistry;

use crate::domain::{ports::workspace_repository::WorkspaceRepository, workspace::WorkspaceInfo};

pub struct OrbitWorkspaceRepo;

impl WorkspaceRepository for OrbitWorkspaceRepo {
    fn list(&self) -> Vec<WorkspaceInfo> {
        WorkspaceRegistry::load()
            .workspaces
            .into_iter()
            .map(|e| WorkspaceInfo {
                name: e.name,
                slug: e.slug,
                is_default: e.is_default,
            })
            .collect()
    }
}
