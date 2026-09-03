use crate::domain::{document::DocInfo, errors::DomainError};

/// Port: contract for document I/O operations.
/// The concrete implementation uses orbit_core::document and std::fs.
pub trait DocumentStore: Send + Sync {
    fn list(&self) -> Vec<DocInfo>;
    fn read_bytes(&self, path: &str) -> Result<Vec<u8>, DomainError>;
    fn delete(&self, id: &str, workspace: &str) -> Result<(), DomainError>;
    fn archive(&self, id: &str, workspace: &str) -> Result<(), DomainError>;
    /// Copy an external file into the given scope's document directory and register
    /// it in the document index. Returns the freshly created entry.
    fn import(
        &self,
        source_path: &str,
        workspace: &str,
        tenant: &str,
        project: &str,
        repository: &str,
    ) -> Result<DocInfo, DomainError>;
}
