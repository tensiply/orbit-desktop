use std::collections::HashMap;

use crate::domain::{
    architecture::{ArchCatalogDto, ArchEntityDto, SaveEntityArgs},
    errors::DomainError,
};

pub trait ArchCatalogRepo: Send + Sync {
    fn load(&self, workspace: &str, tenant: &str) -> Result<ArchCatalogDto, DomainError>;
    fn save_entity(&self, args: SaveEntityArgs) -> Result<ArchEntityDto, DomainError>;
    fn delete_entity(
        &self,
        workspace: &str,
        tenant: &str,
        kind_folder: &str,
        id: &str,
    ) -> Result<(), DomainError>;
    fn load_layout(
        &self,
        catalog_path: &str,
    ) -> Result<HashMap<String, [f64; 2]>, DomainError>;
    fn save_layout(
        &self,
        catalog_path: &str,
        positions: HashMap<String, [f64; 2]>,
    ) -> Result<(), DomainError>;
    fn load_routes(
        &self,
        catalog_path: &str,
    ) -> Result<HashMap<String, HashMap<String, f64>>, DomainError>;
    fn save_routes(
        &self,
        catalog_path: &str,
        routes: HashMap<String, HashMap<String, f64>>,
    ) -> Result<(), DomainError>;
}
