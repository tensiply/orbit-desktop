use std::sync::Arc;
use tauri::State;

use crate::domain::ports::workspace_repository::WorkspaceRepository;
use crate::domain::workspace::WorkspaceInfo;

#[tauri::command]
pub fn workspace_list(repo: State<'_, Arc<dyn WorkspaceRepository>>) -> Vec<WorkspaceInfo> {
    repo.list()
}
