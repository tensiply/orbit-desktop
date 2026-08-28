use serde::Serialize;

/// Event emitted over Tauri's event bus when the PTY produces output.
/// The frontend listens to "pty-data" events and routes by tab_id.
#[derive(Debug, Clone, Serialize)]
pub struct PtyDataEvent {
    pub tab_id: String,
    pub data: String,
}
