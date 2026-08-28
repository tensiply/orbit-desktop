use serde::Serialize;
use std::collections::VecDeque;
use std::sync::{Arc, RwLock};

const MAX_LOGS: usize = 2000;
const MAX_CMDS: usize = 500;

#[derive(Debug, Clone, Serialize)]
pub struct LogEntry {
    pub ts: u64,
    pub level: String,
    pub target: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct CmdEntry {
    pub ts: u64,
    pub command: String,
    pub args_summary: String,
    pub status: String,
    pub duration_ms: u64,
    pub error: Option<String>,
}

#[derive(Default)]
pub struct DebugBuffer {
    pub logs: VecDeque<LogEntry>,
    pub cmds: VecDeque<CmdEntry>,
}

impl DebugBuffer {
    pub fn push_log(&mut self, entry: LogEntry) {
        if self.logs.len() >= MAX_LOGS {
            self.logs.pop_front();
        }
        self.logs.push_back(entry);
    }

    pub fn push_cmd(&mut self, entry: CmdEntry) {
        if self.cmds.len() >= MAX_CMDS {
            self.cmds.pop_front();
        }
        self.cmds.push_back(entry);
    }

    pub fn logs_filtered(
        &self,
        level: Option<&str>,
        target: Option<&str>,
        limit: usize,
    ) -> Vec<LogEntry> {
        let filtered: Vec<&LogEntry> = self
            .logs
            .iter()
            .filter(|e| level.is_none_or(|l| e.level.eq_ignore_ascii_case(l)))
            .filter(|e| target.is_none_or(|t| e.target.contains(t)))
            .collect();

        let skip = filtered.len().saturating_sub(limit);
        filtered[skip..].iter().map(|e| (*e).clone()).collect()
    }

    pub fn cmds_filtered(&self, command: Option<&str>, limit: usize) -> Vec<CmdEntry> {
        let filtered: Vec<&CmdEntry> = self
            .cmds
            .iter()
            .filter(|e| command.is_none_or(|c| e.command.contains(c)))
            .collect();

        let skip = filtered.len().saturating_sub(limit);
        filtered[skip..].iter().map(|e| (*e).clone()).collect()
    }
}

pub type SharedDebugBuffer = Arc<RwLock<DebugBuffer>>;

pub fn new_shared() -> SharedDebugBuffer {
    Arc::new(RwLock::new(DebugBuffer::default()))
}
