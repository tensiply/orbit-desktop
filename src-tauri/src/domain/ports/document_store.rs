use crate::domain::{document::DocInfo, errors::DomainError};

/// Port: contract for document I/O operations.
/// The concrete implementation uses orbit_core::document and std::fs.
pub trait DocumentStore: Send + Sync {
    fn list(&self) -> Vec<DocInfo>;
    fn read_bytes(&self, path: &str) -> Result<Vec<u8>, DomainError>;
    fn delete(&self, id: &str, workspace: &str) -> Result<(), DomainError>;
    fn archive(&self, id: &str, workspace: &str) -> Result<(), DomainError>;
}
