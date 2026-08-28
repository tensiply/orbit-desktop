use std::sync::Arc;
use base64::{engine::general_purpose::STANDARD, Engine as _};
use tauri::State;

use crate::domain::{document::DocInfo, ports::document_store::DocumentStore};

/// Returns file content as base64 so the frontend can build a Blob URL without hitting
/// Tauri's CSP restrictions on asset:// URLs inside iframes.
#[tauri::command]
pub fn document_read_b64(
    store: State<'_, Arc<dyn DocumentStore>>,
    path: String,
) -> Result<String, String> {
    let bytes = store.read_bytes(&path).map_err(|e| e.to_string())?;
    Ok(STANDARD.encode(&bytes))
}

#[tauri::command]
pub fn document_delete(
    store: State<'_, Arc<dyn DocumentStore>>,
    id: String,
    workspace: String,
) -> Result<(), String> {
    store.delete(&id, &workspace).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn document_archive(
    store: State<'_, Arc<dyn DocumentStore>>,
    id: String,
    workspace: String,
) -> Result<(), String> {
    store.archive(&id, &workspace).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn document_list(store: State<'_, Arc<dyn DocumentStore>>) -> Vec<DocInfo> {
    store.list()
}

/// Open the folder containing the document in the system file manager.
#[tauri::command]
pub fn document_reveal(path: String) -> Result<(), String> {
    let p = std::path::Path::new(&path);
    let dir = if p.is_dir() { p.to_owned() } else { p.parent().unwrap_or(p).to_owned() };
    std::process::Command::new("xdg-open")
        .arg(&dir)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}
