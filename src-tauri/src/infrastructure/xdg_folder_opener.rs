use std::path::Path;

use crate::domain::ports::folder_opener::FolderOpener;

/// Opens a directory using xdg-open (Linux/BSD standard).
pub struct XdgFolderOpener;

impl FolderOpener for XdgFolderOpener {
    fn open(&self, path: &Path) -> Result<(), String> {
        std::process::Command::new("xdg-open")
            .arg(path)
            .spawn()
            .map(|_| ())
            .map_err(|e| e.to_string())
    }
}
