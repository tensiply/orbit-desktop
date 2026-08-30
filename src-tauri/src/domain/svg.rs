use serde::Serialize;

/// SVG entry as returned to the frontend.
#[derive(Debug, Clone, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
#[cfg_attr(test, ts(export, rename = "SvgEntry"))]
pub struct SvgInfo {
    pub id: String,
    pub title: String,
    pub backend: String,
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
