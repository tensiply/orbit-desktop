use serde::Serialize;

/// Document entry as returned to the frontend.
/// Maps 1:1 from orbit_core::document entries; the handler owns the mapping.
#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
#[cfg_attr(test, ts(export, rename = "DocEntry"))]
pub struct DocInfo {
    pub id: String,
    pub title: String,
    pub format: String,
    pub template: Option<String>,
    pub output_path: String,
    pub source_path: String,
    pub workspace: String,
    pub tenant: String,
    pub project: String,
    pub repository: String,
    #[cfg_attr(test, ts(type = "number"))]
    pub created_at: u64,
    #[cfg_attr(test, ts(type = "number"))]
    pub updated_at: u64,
}
