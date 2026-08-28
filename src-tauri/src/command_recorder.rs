use crate::debug_buffer::{CmdEntry, SharedDebugBuffer};
use std::time::{SystemTime, UNIX_EPOCH};

pub struct CommandRecorder {
    buffer: SharedDebugBuffer,
}

impl CommandRecorder {
    pub fn new(buffer: SharedDebugBuffer) -> Self {
        Self { buffer }
    }

    pub fn record(
        &self,
        command: &str,
        args_summary: &str,
        duration_ms: u64,
        ok: bool,
        error: Option<&str>,
    ) {
        let ts = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0);

        let entry = CmdEntry {
            ts,
            command: command.to_string(),
            args_summary: args_summary.to_string(),
            status: if ok { "ok" } else { "error" }.to_string(),
            duration_ms,
            error: error.map(|e| e.to_string()),
        };

        if let Ok(mut buf) = self.buffer.write() {
            buf.push_cmd(entry);
        }
    }
}
