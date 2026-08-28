use crate::domain::workspace::WorkspaceInfo;

/// Port: contract for listing registered orbit workspaces.
pub trait WorkspaceRepository: Send + Sync {
    fn list(&self) -> Vec<WorkspaceInfo>;
}
