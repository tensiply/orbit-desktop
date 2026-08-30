use orbit_core::svg::{load_all_entries_global, SvgEntry};
use orbit_core::data_paths;

use crate::domain::svg::SvgInfo;

fn to_info(e: SvgEntry) -> SvgInfo {
    SvgInfo {
        id: e.id,
        title: e.title,
        backend: e.backend,
        template: e.template,
        output_path: e.output_path.to_string_lossy().to_string(),
        source_path: e.source_path.to_string_lossy().to_string(),
        workspace: e.workspace,
        tenant: e.tenant,
        project: e.project,
        repository: e.repository,
        created_at: e.created_at,
        updated_at: e.updated_at,
    }
}

#[tauri::command]
pub fn svg_list() -> Vec<SvgInfo> {
    let mut entries = load_all_entries_global();
    entries.sort_by_key(|e| std::cmp::Reverse(e.updated_at));
    entries.into_iter().map(to_info).collect()
}

#[tauri::command]
pub fn svg_delete(id: String, workspace: String) -> Result<(), String> {
    let entries = load_all_entries_global();
    let entry = entries.iter().find(|e| e.id == id)
        .ok_or_else(|| format!("svg {id} not found"))?;
    let path = entry.output_path.clone();

    remove_from_index(&workspace, &id)?;

    if path.exists() {
        std::fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn svg_archive(id: String, workspace: String) -> Result<(), String> {
    let entries = load_all_entries_global();
    let entry = entries.iter().find(|e| e.id == id)
        .ok_or_else(|| format!("svg {id} not found"))?;
    let src = entry.output_path.clone();

    if src.exists() {
        let archived_dir = src.parent()
            .map(|p| p.join("archived"))
            .unwrap_or_default();
        std::fs::create_dir_all(&archived_dir).map_err(|e| e.to_string())?;
        let dst = archived_dir.join(src.file_name().unwrap_or_default());
        std::fs::rename(&src, &dst).map_err(|e| e.to_string())?;
    }

    remove_from_index(&workspace, &id)?;
    Ok(())
}

#[tauri::command]
pub fn svg_reveal(path: String) -> Result<(), String> {
    let p = std::path::Path::new(&path);
    let dir = if p.is_dir() { p.to_owned() } else { p.parent().unwrap_or(p).to_owned() };
    std::process::Command::new("xdg-open")
        .arg(&dir)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

fn remove_from_index(workspace: &str, id: &str) -> Result<(), String> {
    let path = data_paths::svgs_index_path_for(Some(workspace));
    if !path.exists() {
        return Ok(());
    }
    let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let kept: String = content
        .lines()
        .filter(|l| {
            serde_json::from_str::<serde_json::Value>(l)
                .ok()
                .and_then(|v| v.get("id").and_then(|i| i.as_str()).map(|i| i != id))
                .unwrap_or(true)
        })
        .map(|l| format!("{l}\n"))
        .collect();
    std::fs::write(&path, kept).map_err(|e| e.to_string())
}
