use serde::{Deserialize, Serialize};

/// Architecture catalog entity as returned to the frontend.
#[derive(Debug, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
#[cfg_attr(test, ts(export))]
pub struct ArchEntityDto {
    pub id: String,
    pub kind: String,
    pub kind_folder: String,
    pub name: String,
    pub description: Option<String>,
    pub criticality: Option<String>,
    pub lifecycle: Option<String>,
    pub tenant: Option<String>,
    pub owner: Option<String>,
    pub team: Option<String>,
    pub tags: Vec<String>,
    pub connections: Vec<String>,
    pub last_updated: Option<String>,
    pub notes: Option<String>,
    pub summary: Option<String>,
    /// Environment names derived from the `environments` YAML map, falling back to `lifecycle`.
    pub environments: Vec<String>,
}

/// Full catalog response including load errors (so the frontend can surface bad YAML files).
#[derive(Debug, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
#[cfg_attr(test, ts(export))]
pub struct ArchCatalogDto {
    pub workspace: String,
    pub tenant: String,
    pub catalog_path: String,
    pub entities: Vec<ArchEntityDto>,
    pub errors: Vec<(String, String)>,
}

/// Input args for creating or updating a catalog entity.
#[derive(Debug, Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
#[cfg_attr(test, ts(export))]
pub struct SaveEntityArgs {
    pub workspace: String,
    pub tenant: String,
    pub kind_folder: String,
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub criticality: Option<String>,
    pub lifecycle: Option<String>,
    pub owner: Option<String>,
    pub team: Option<String>,
    pub tags: Vec<String>,
    pub connections: Vec<String>,
    pub notes: Option<String>,
    pub last_updated: Option<String>,
}
