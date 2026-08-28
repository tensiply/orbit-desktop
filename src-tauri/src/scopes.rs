use std::sync::Arc;
use tauri::State;

use crate::domain::{ports::scope_repository::ScopeRepository, scope::ScopeTreeWorkspace};

#[tauri::command]
pub fn scope_tree(repo: State<'_, Arc<dyn ScopeRepository>>) -> Vec<ScopeTreeWorkspace> {
    repo.scope_tree()
}

/// Open a scope folder in the system file manager.
/// `path_segments` is `[workspace, tenant?, project?, repository?]`.
#[tauri::command]
pub fn scope_open_folder(path_segments: Vec<String>) -> Result<(), String> {
    if path_segments.is_empty() {
        return Err("no path segments".into());
    }
    let home = std::env::var("HOME")
        .map(std::path::PathBuf::from)
        .unwrap_or_else(|_| std::path::PathBuf::from("/tmp"));
    let path = path_segments.iter().fold(home, |acc, seg| acc.join(seg));
    std::process::Command::new("xdg-open")
        .arg(&path)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}
