use std::collections::HashMap;
use std::sync::Arc;
use tauri::State;

use crate::domain::{
    architecture::SaveEntityArgs,
    ports::arch_catalog::ArchCatalogRepo,
};

#[tauri::command]
pub fn architecture_load(
    workspace: String,
    tenant: String,
    repo: State<'_, Arc<dyn ArchCatalogRepo>>,
) -> Result<crate::domain::architecture::ArchCatalogDto, String> {
    repo.load(&workspace, &tenant).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn architecture_save_entity(
    args: SaveEntityArgs,
    repo: State<'_, Arc<dyn ArchCatalogRepo>>,
) -> Result<crate::domain::architecture::ArchEntityDto, String> {
    repo.save_entity(args).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn architecture_delete_entity(
    workspace: String,
    tenant: String,
    kind_folder: String,
    id: String,
    repo: State<'_, Arc<dyn ArchCatalogRepo>>,
) -> Result<(), String> {
    repo.delete_entity(&workspace, &tenant, &kind_folder, &id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn architecture_load_layout(
    catalog_path: String,
    repo: State<'_, Arc<dyn ArchCatalogRepo>>,
) -> Result<HashMap<String, [f64; 2]>, String> {
    repo.load_layout(&catalog_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn architecture_save_layout(
    catalog_path: String,
    positions: HashMap<String, [f64; 2]>,
    repo: State<'_, Arc<dyn ArchCatalogRepo>>,
) -> Result<(), String> {
    repo.save_layout(&catalog_path, positions)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn architecture_load_routes(
    catalog_path: String,
    repo: State<'_, Arc<dyn ArchCatalogRepo>>,
) -> Result<HashMap<String, HashMap<String, f64>>, String> {
    repo.load_routes(&catalog_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn architecture_save_routes(
    catalog_path: String,
    routes: HashMap<String, HashMap<String, f64>>,
    repo: State<'_, Arc<dyn ArchCatalogRepo>>,
) -> Result<(), String> {
    repo.save_routes(&catalog_path, routes)
        .map_err(|e| e.to_string())
}
