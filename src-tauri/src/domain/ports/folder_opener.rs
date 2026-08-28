use std::path::Path;

/// Port: contract for opening a directory in the system file manager.
pub trait FolderOpener: Send + Sync {
    fn open(&self, path: &Path) -> Result<(), String>;
}
