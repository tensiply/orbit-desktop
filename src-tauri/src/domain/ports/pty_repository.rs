use crate::domain::errors::DomainError;

/// Port: contract for PTY lifecycle operations (write, resize, close).
///
/// Opening a PTY is NOT part of this trait because it requires spawning a reader
/// thread that emits Tauri events — that coupling to the presentation layer is
/// intentional and stays in the infrastructure/presentation module.
pub trait PtyRepository: Send + Sync {
    /// Write raw bytes to the PTY input.
    fn write(&self, tab_id: &str, data: &[u8]) -> Result<(), DomainError>;

    /// Resize the PTY terminal dimensions.
    fn resize(&self, tab_id: &str, cols: u16, rows: u16) -> Result<(), DomainError>;

    /// Drop the PTY handle, terminating the child process.
    fn close(&self, tab_id: &str);

    fn contains(&self, tab_id: &str) -> bool;
}
