use crate::domain::{
    document::DocInfo,
    errors::DomainError,
    ports::document_store::DocumentStore,
};
use orbit_core::data_paths::documents_scope_dir;
use orbit_core::document::{
    load_all_entries_global, next_id, now_secs_pub, remove_entry, save_entry, DocumentEntry,
};
use std::path::Path;

/// Reads and mutates documents via orbit_core's document index + std::fs for file operations.
pub struct FsDocumentStore;

impl DocumentStore for FsDocumentStore {
    fn list(&self) -> Vec<DocInfo> {
        let mut entries = load_all_entries_global();
        entries.sort_by_key(|e| std::cmp::Reverse(e.updated_at));
        entries
            .into_iter()
            .map(|e| DocInfo {
                id: e.id,
                title: e.title,
                format: e.format,
                template: e.template,
                output_path: e.output_path.to_string_lossy().to_string(),
                source_path: e.source_path.to_string_lossy().to_string(),
                workspace: e.workspace,
                tenant: e.tenant,
                project: e.project,
                repository: e.repository,
                created_at: e.created_at,
                updated_at: e.updated_at,
            })
            .collect()
    }

    fn read_bytes(&self, path: &str) -> Result<Vec<u8>, DomainError> {
        std::fs::read(path).map_err(DomainError::from)
    }

    fn delete(&self, id: &str, workspace: &str) -> Result<(), DomainError> {
        let entries = load_all_entries_global();
        let entry = entries
            .iter()
            .find(|e| e.id == id)
            .ok_or_else(|| DomainError::NotFound(format!("document {id}")))?;
        let path = entry.output_path.clone();
        remove_entry(workspace, id).map_err(DomainError::from)?;
        if path.exists() {
            std::fs::remove_file(&path).map_err(DomainError::from)?;
        }
        Ok(())
    }

    fn import(
        &self,
        source_path: &str,
        workspace: &str,
        tenant: &str,
        project: &str,
        repository: &str,
    ) -> Result<DocInfo, DomainError> {
        let src = Path::new(source_path);
        let file_name = src
            .file_name()
            .ok_or_else(|| DomainError::InvalidInput(format!("no file name in {source_path}")))?
            .to_string_lossy()
            .to_string();

        let dir = documents_scope_dir(workspace, tenant, project, repository);
        std::fs::create_dir_all(&dir).map_err(DomainError::from)?;
        let dst = dir.join(&file_name);
        std::fs::copy(src, &dst).map_err(DomainError::from)?;

        let id = next_id(workspace);
        let now = now_secs_pub();
        let format = src
            .extension()
            .map(|e| e.to_string_lossy().to_string())
            .unwrap_or_default();
        let title = src
            .file_stem()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_else(|| file_name.clone());

        let entry = DocumentEntry {
            id: id.clone(),
            title: title.clone(),
            format: format.clone(),
            template: None,
            source_path: dst.clone(),
            output_path: dst.clone(),
            workspace: workspace.to_string(),
            tenant: tenant.to_string(),
            project: project.to_string(),
            repository: repository.to_string(),
            vars: Default::default(),
            created_at: now,
            updated_at: now,
        };
        save_entry(workspace, &entry).map_err(DomainError::from)?;

        let path_str = dst.to_string_lossy().to_string();
        Ok(DocInfo {
            id,
            title,
            format,
            template: None,
            output_path: path_str.clone(),
            source_path: path_str,
            workspace: workspace.to_string(),
            tenant: tenant.to_string(),
            project: project.to_string(),
            repository: repository.to_string(),
            created_at: now,
            updated_at: now,
        })
    }

    fn archive(&self, id: &str, workspace: &str) -> Result<(), DomainError> {
        let entries = load_all_entries_global();
        let entry = entries
            .iter()
            .find(|e| e.id == id)
            .ok_or_else(|| DomainError::NotFound(format!("document {id}")))?;
        let src = entry.output_path.clone();
        if src.exists() {
            let archived_dir =
                src.parent().map(|p| p.join("archived")).unwrap_or_default();
            std::fs::create_dir_all(&archived_dir).map_err(DomainError::from)?;
            let dst = archived_dir.join(src.file_name().unwrap_or_default());
            std::fs::rename(&src, &dst).map_err(DomainError::from)?;
        }
        remove_entry(workspace, id).map_err(DomainError::from)?;
        Ok(())
    }
}
