use std::collections::HashMap;
use std::path::PathBuf;

use orbit_core::{
    architecture::{catalog_root, delete_entity, load_catalog, save_entity, CatalogEntity, EntityKind},
    resolver::{self, ResolveArgs},
};

use crate::domain::{
    architecture::{ArchCatalogDto, ArchEntityDto, SaveEntityArgs},
    errors::DomainError,
    ports::arch_catalog::ArchCatalogRepo,
};

pub struct FsArchCatalog;

fn to_dto(e: CatalogEntity) -> ArchEntityDto {
    let summary = e.summary();
    let kind_folder = e.kind.folder_name().to_string();

    let env_keys: Vec<String> = e
        .environments
        .as_ref()
        .and_then(|v| v.as_mapping())
        .map(|m| m.keys().filter_map(|k| k.as_str().map(|s| s.to_lowercase())).collect())
        .unwrap_or_default();

    let environments = if env_keys.is_empty() {
        e.lifecycle.iter().map(|s| s.to_lowercase()).collect()
    } else {
        env_keys
    };

    ArchEntityDto {
        kind: e.kind.display_name().to_string(),
        kind_folder,
        summary,
        connections: e.connections,
        id: e.id,
        name: e.name,
        description: e.description,
        criticality: e.criticality,
        lifecycle: e.lifecycle,
        tenant: e.tenant,
        owner: e.owner,
        team: e.team,
        tags: e.tags,
        last_updated: e.last_updated,
        notes: e.notes,
        environments,
    }
}

fn positions_path(catalog_path: &str) -> PathBuf {
    PathBuf::from(catalog_path).join(".positions.json")
}

fn routes_path(catalog_path: &str) -> PathBuf {
    PathBuf::from(catalog_path).join(".routes.json")
}

impl ArchCatalogRepo for FsArchCatalog {
    fn load(&self, workspace: &str, tenant: &str) -> Result<ArchCatalogDto, DomainError> {
        let scope = resolver::resolve(ResolveArgs {
            workspace: Some(workspace.to_string()),
            tenant: Some(tenant.to_string()),
            project: None,
            repository: None,
        })
        .map_err(|e| DomainError::Other(e.to_string()))?;
        let result = load_catalog(&scope.tenant_dir);
        let catalog_path = catalog_root(&scope.tenant_dir).to_string_lossy().to_string();

        let entities = result.entities.into_iter().map(to_dto).collect();
        let errors = result
            .errors
            .into_iter()
            .map(|(p, e)| {
                let filename = p
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("?")
                    .to_string();
                (filename, e)
            })
            .collect();

        Ok(ArchCatalogDto {
            workspace: workspace.to_string(),
            tenant: tenant.to_string(),
            catalog_path,
            entities,
            errors,
        })
    }

    fn save_entity(&self, args: SaveEntityArgs) -> Result<ArchEntityDto, DomainError> {
        let scope = resolver::resolve(ResolveArgs {
            workspace: Some(args.workspace.clone()),
            tenant: Some(args.tenant.clone()),
            project: None,
            repository: None,
        })
        .map_err(|e| DomainError::Other(e.to_string()))?;
        let entity = CatalogEntity {
            kind: EntityKind::from_folder(&args.kind_folder),
            id: args.id,
            name: args.name,
            description: args.description,
            criticality: args.criticality,
            lifecycle: args.lifecycle,
            owner: args.owner,
            team: args.team,
            tenant: Some(args.tenant),
            tags: args.tags,
            connections: args.connections,
            notes: args.notes,
            last_updated: args.last_updated,
            ..Default::default()
        };
        save_entity(&scope.tenant_dir, &entity).map_err(|e| DomainError::Other(e.to_string()))?;
        Ok(to_dto(entity))
    }

    fn delete_entity(
        &self,
        workspace: &str,
        tenant: &str,
        kind_folder: &str,
        id: &str,
    ) -> Result<(), DomainError> {
        let scope = resolver::resolve(ResolveArgs {
            workspace: Some(workspace.to_string()),
            tenant: Some(tenant.to_string()),
            project: None,
            repository: None,
        })
        .map_err(|e| DomainError::Other(e.to_string()))?;
        delete_entity(&scope.tenant_dir, kind_folder, id)
            .map_err(|e| DomainError::Other(e.to_string()))
    }

    fn load_layout(&self, catalog_path: &str) -> Result<HashMap<String, [f64; 2]>, DomainError> {
        let path = positions_path(catalog_path);
        if !path.exists() {
            return Ok(HashMap::new());
        }
        let s = std::fs::read_to_string(&path)?;
        serde_json::from_str(&s).map_err(|e| DomainError::Other(e.to_string()))
    }

    fn save_layout(
        &self,
        catalog_path: &str,
        positions: HashMap<String, [f64; 2]>,
    ) -> Result<(), DomainError> {
        let path = positions_path(catalog_path);
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let json = serde_json::to_string(&positions).map_err(|e| DomainError::Other(e.to_string()))?;
        std::fs::write(&path, json)?;
        Ok(())
    }

    fn load_routes(
        &self,
        catalog_path: &str,
    ) -> Result<HashMap<String, HashMap<String, f64>>, DomainError> {
        let path = routes_path(catalog_path);
        if !path.exists() {
            return Ok(HashMap::new());
        }
        let s = std::fs::read_to_string(&path)?;
        serde_json::from_str(&s).map_err(|e| DomainError::Other(e.to_string()))
    }

    fn save_routes(
        &self,
        catalog_path: &str,
        routes: HashMap<String, HashMap<String, f64>>,
    ) -> Result<(), DomainError> {
        let path = routes_path(catalog_path);
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let json = serde_json::to_string(&routes).map_err(|e| DomainError::Other(e.to_string()))?;
        std::fs::write(&path, json)?;
        Ok(())
    }
}
