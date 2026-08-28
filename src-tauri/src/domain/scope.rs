use serde::Serialize;

/// Full workspace scope tree returned to the frontend for sidebar navigation.
/// The hierarchy mirrors the filesystem: workspace → tenant → project → repository.

#[derive(Debug, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
#[cfg_attr(test, ts(export))]
pub struct ScopeTreeRepo {
    pub name: String,
    pub work_dir: String,
    pub description: Option<String>,
}

#[derive(Debug, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
#[cfg_attr(test, ts(export))]
pub struct ScopeTreeProject {
    pub name: String,
    pub repositories: Vec<ScopeTreeRepo>,
}

#[derive(Debug, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
#[cfg_attr(test, ts(export))]
pub struct ScopeTreeTenant {
    pub name: String,
    pub projects: Vec<ScopeTreeProject>,
}

#[derive(Debug, Serialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
#[cfg_attr(test, ts(export))]
pub struct ScopeTreeWorkspace {
    pub name: String,
    pub tenants: Vec<ScopeTreeTenant>,
}
