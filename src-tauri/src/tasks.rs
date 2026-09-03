use orbit_core::task::{self, OrbitTask, TaskFilter, TaskPatch, TaskPriority, TaskStatus};
use serde::Deserialize;

// ── DTOs for Tauri (Serialize/Deserialize over the IPC boundary) ───────────────

#[derive(Debug, Deserialize)]
pub struct TaskCreateArgs {
    pub workspace: String,
    pub title: String,
    pub description: Option<String>,
    pub priority: Option<String>,
    pub tenant: Option<String>,
    pub project: Option<String>,
    pub repository: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct TaskUpdateArgs {
    pub workspace: String,
    pub id: String,
    pub title: Option<String>,
    pub description: Option<Option<String>>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub tags: Option<Vec<String>>,
}

// ── commands ──────────────────────────────────────────────────────────────────

/// Returns tasks for a workspace, newest-first.
/// Optionally filter by status ("todo", "in_progress", "done", "blocked", "cancelled")
/// and/or source ("manual", "jira", ...).
#[tauri::command]
pub fn task_list(
    workspace: String,
    status_filter: Option<String>,
    source_filter: Option<String>,
    tenant: Option<String>,
    project: Option<String>,
    repository: Option<String>,
) -> Result<Vec<OrbitTask>, String> {
    let filter = TaskFilter {
        status: status_filter.as_deref().and_then(TaskStatus::parse),
        source: source_filter,
        tenant,
        project,
        repository,
        limit: None,
    };
    task::list(&workspace, &filter).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn task_get(workspace: String, id: String) -> Result<Option<OrbitTask>, String> {
    task::get(&workspace, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn task_create(args: TaskCreateArgs) -> Result<OrbitTask, String> {
    use orbit_core::task::TaskSource;

    let priority = args
        .priority
        .as_deref()
        .and_then(TaskPriority::parse)
        .unwrap_or(TaskPriority::Medium);

    let new_task = OrbitTask {
        id: String::new(),
        title: args.title,
        description: args.description,
        status: TaskStatus::Todo,
        priority,
        task_type: None,
        source: TaskSource::Manual,
        workspace: args.workspace.clone(),
        tenant: args.tenant,
        project: args.project,
        repository: args.repository,
        tags: args.tags.unwrap_or_default(),
        created_at: 0,
        updated_at: 0,
    };
    task::add(&args.workspace, new_task).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn task_update(args: TaskUpdateArgs) -> Result<OrbitTask, String> {
    let patch = TaskPatch {
        title: args.title,
        description: args.description,
        status: args.status.as_deref().and_then(TaskStatus::parse),
        priority: args.priority.as_deref().and_then(TaskPriority::parse),
        task_type: None,
        tenant: None,
        project: None,
        repository: None,
        tags: args.tags,
    };
    task::update(&args.workspace, &args.id, patch).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn task_delete(workspace: String, id: String) -> Result<bool, String> {
    task::delete(&workspace, &id).map_err(|e| e.to_string())
}
